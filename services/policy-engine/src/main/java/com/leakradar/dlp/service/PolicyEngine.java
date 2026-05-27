package com.leakradar.policyengine.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leakradar.common.events.LeakCandidate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class PolicyEngine {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public PolicyEngine(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public LeakCandidate apply(LeakCandidate candidate) {
        if (isAllowlisted(candidate)) {
            return null;
        }
        String severity = mapSeverity(candidate);
        return new LeakCandidate(
                candidate.candidateId(),
                candidate.tenantId(),
                candidate.source(),
                candidate.type(),
                candidate.ruleId(),
                candidate.confidence(),
                severity,
                candidate.repoId(),
                candidate.filePath(),
                candidate.lineStart(),
                candidate.lineEnd(),
                candidate.maskedSnippet(),
                candidate.fingerprint(),
                candidate.commitSha(),
                candidate.eventId(),
                candidate.externalUrl(),
                candidate.timestamp(),
                candidate.mlLabel(),
                candidate.mlConfidence()
        );
    }

    private boolean isAllowlisted(LeakCandidate c) {
        try {
            List<Map<String, Object>> policies = jdbc.queryForList(
                    "SELECT allowlist FROM policies WHERE tenant_id = ?::uuid AND enabled = true",
                    c.tenantId());
            for (Map<String, Object> row : policies) {
                Object allowlist = row.get("allowlist");
                if (allowlist == null) continue;
                JsonNode nodes = objectMapper.valueToTree(allowlist);
                if (!nodes.isArray()) continue;
                for (JsonNode rule : nodes) {
                    String pathPattern = rule.path("path").asText("");
                    if (c.filePath() != null && matchesGlob(c.filePath(), pathPattern)) {
                        return true;
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private String mapSeverity(LeakCandidate c) {
        try {
            List<Map<String, Object>> policies = jdbc.queryForList(
                    "SELECT severity_map FROM policies WHERE tenant_id = ?::uuid AND enabled = true LIMIT 1",
                    c.tenantId());
            if (!policies.isEmpty()) {
                JsonNode map = objectMapper.valueToTree(policies.get(0).get("severity_map"));
                String fromPolicy = map.path(c.ruleId()).asText(null);
                if (fromPolicy != null) return fromPolicy;
            }
        } catch (Exception ignored) {
        }
        return c.severity() != null ? c.severity() : "medium";
    }

    private boolean matchesGlob(String path, String pattern) {
        if (pattern == null || pattern.isBlank()) return false;
        String regex = pattern.replace(".", "\\.").replace("**", ".*").replace("*", "[^/]*");
        return path.matches(regex);
    }
}
