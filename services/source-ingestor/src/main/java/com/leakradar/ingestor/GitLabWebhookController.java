package com.leakradar.ingestor;

import com.leakradar.ingestor.service.IngestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks/gitlab")
public class GitLabWebhookController {

    private final IngestService ingestService;
    private final String webhookSecret;

    public GitLabWebhookController(IngestService ingestService,
                                   @Value("${leakradar.gitlab.webhook-secret:}") String webhookSecret) {
        this.ingestService = ingestService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping
    public ResponseEntity<Void> handle(@RequestHeader(value = "X-Gitlab-Event", required = false) String event,
                                       @RequestHeader(value = "X-Gitlab-Token", required = false) String token,
                                       @RequestBody String payload) throws Exception {
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (!webhookSecret.equals(token)) {
                return ResponseEntity.status(401).build();
            }
        }
        if ("Push Hook".equals(event) || "Merge Request Hook".equals(event)) {
            ingestService.ingestGitLabPayload(event, payload);
        }
        return ResponseEntity.accepted().build();
    }
}
