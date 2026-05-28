package com.leakradar.ingestor;

import com.leakradar.ingestor.service.IngestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks/bitbucket")
public class BitbucketWebhookController {

    private final IngestService ingestService;
    private final String webhookSecret;

    public BitbucketWebhookController(IngestService ingestService,
                                      @Value("${leakradar.bitbucket.webhook-secret:}") String webhookSecret) {
        this.ingestService = ingestService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping
    public ResponseEntity<Void> handle(@RequestHeader(value = "X-Event-Key", required = false) String event,
                                       @RequestParam(value = "secret", required = false) String secret,
                                       @RequestBody String payload) throws Exception {
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (!webhookSecret.equals(secret)) {
                return ResponseEntity.status(401).build();
            }
        }
        if ("repo:push".equals(event) || "pullrequest:created".equals(event)) {
            ingestService.ingestBitbucketPayload(event, payload);
        }
        return ResponseEntity.accepted().build();
    }
}
