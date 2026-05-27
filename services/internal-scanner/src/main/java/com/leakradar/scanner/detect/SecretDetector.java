package com.leakradar.scanner.detect;

import com.leakradar.common.events.LeakCandidate;
import com.leakradar.common.events.RepoEvent;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SecretDetector {

    private static final Pattern AWS_KEY = Pattern.compile("AKIA[0-9A-Z]{16}");
    private static final Pattern GITHUB_PAT = Pattern.compile("ghp_[a-zA-Z0-9]{36}");
    private static final Pattern GENERIC_SECRET = Pattern.compile(
            "(?i)(api[_-]?key|secret|password|token)\\s*[=:]\\s*['\"]?([a-zA-Z0-9_\\-]{8,})");
    private static final Pattern PEM = Pattern.compile("-----BEGIN (RSA |EC )?PRIVATE KEY-----");
    private static final Pattern ENV_FILE = Pattern.compile("(?i)\\.env($|\\.local)");

    public List<LeakCandidate> scan(RepoEvent event, RepoEvent.FileChange file) {
        List<LeakCandidate> results = new ArrayList<>();
        String path = file.path();
        String content = file.content();

        if (ENV_FILE.matcher(path).find()) {
            results.add(build(event, file, "env_file", "config", "medium", 0.75,
                    "Environment file detected: " + path, path, 1, 1, path));
        }

        scanPattern(results, event, file, AWS_KEY, "aws_key", "secret", "critical", 0.9);
        scanPattern(results, event, file, GITHUB_PAT, "github_pat", "secret", "high", 0.85);
        scanPattern(results, event, file, PEM, "private_key", "secret", "critical", 0.95);

        Matcher generic = GENERIC_SECRET.matcher(content);
        while (generic.find()) {
            String matched = generic.group(2);
            if (isLikelyTest(matched)) continue;
            results.add(build(event, file, "generic_secret", "secret", "high", 0.7,
                    matched, path, lineNumber(content, generic.start()),
                    lineNumber(content, generic.end()), matched));
        }

        return results;
    }

    private void scanPattern(List<LeakCandidate> results, RepoEvent event, RepoEvent.FileChange file,
                             Pattern pattern, String ruleId, String type, String severity, double confidence) {
        Matcher m = pattern.matcher(file.content());
        while (m.find()) {
            String matched = m.group();
            if (isLikelyTest(matched)) continue;
            results.add(build(event, file, ruleId, type, severity, confidence, matched, file.path(),
                    lineNumber(file.content(), m.start()), lineNumber(file.content(), m.end()), matched));
        }
    }

    private LeakCandidate build(RepoEvent event, RepoEvent.FileChange file, String ruleId, String type,
                                  String severity, double confidence, String raw, String filePath,
                                  int lineStart, int lineEnd, String fingerprintSource) {
        return new LeakCandidate(
                UUID.randomUUID().toString(),
                event.tenantId(),
                "internal",
                type,
                ruleId,
                confidence,
                severity,
                event.repoId(),
                filePath,
                lineStart,
                lineEnd,
                mask(raw),
                fingerprint(fingerprintSource),
                event.commitSha(),
                event.eventId(),
                null,
                Instant.now(),
                null,
                null
        );
    }

    private boolean isLikelyTest(String value) {
        String v = value.toLowerCase();
        return v.contains("example") || v.contains("dummy") || v.contains("test") || v.contains("xxxx");
    }

    private int lineNumber(String content, int index) {
        int line = 1;
        for (int i = 0; i < index && i < content.length(); i++) {
            if (content.charAt(i) == '\n') line++;
        }
        return line;
    }

    static String mask(String value) {
        if (value == null || value.length() <= 4) return "****";
        return value.substring(0, 2) + "****" + value.substring(value.length() - 2);
    }

    static String fingerprint(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }
}
