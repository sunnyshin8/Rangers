package com.leakradar.ingestor;

import com.fasterxml.jackson.databind.JsonNode;
import com.leakradar.ingestor.service.IngestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@RestController
@RequestMapping("/webhooks/github")
public class GitHubWebhookController {

    private final IngestService ingestService;
    private final String webhookSecret;

    public GitHubWebhookController(IngestService ingestService,
                                 @Value("${leakradar.github.webhook-secret:}") String webhookSecret) {
        this.ingestService = ingestService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping
    public ResponseEntity<Void> handle(@RequestHeader(value = "X-GitHub-Event", required = false) String event,
                                       @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
                                       @RequestBody String payload) throws Exception {
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (!verifySignature(payload, signature)) {
                return ResponseEntity.status(401).build();
            }
        }
        if ("push".equals(event) || "pull_request".equals(event)) {
            ingestService.ingestGitHubPayload(event, payload);
        }
        return ResponseEntity.accepted().build();
    }

    private boolean verifySignature(String payload, String signatureHeader) throws Exception {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String expected = "sha256=" + HexFormat.of().formatHex(hash);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                signatureHeader.getBytes(StandardCharsets.UTF_8));
    }
}
