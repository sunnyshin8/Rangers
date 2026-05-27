package com.leakradar.scanner;

import com.leakradar.common.events.RepoEvent;
import com.leakradar.common.kafka.Topics;
import com.leakradar.scanner.detect.SecretDetector;
import com.leakradar.scanner.service.CoverageService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class RepoEventConsumer {

    private final SecretDetector secretDetector;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final CoverageService coverageService;

    public RepoEventConsumer(SecretDetector secretDetector,
                             KafkaTemplate<String, Object> kafkaTemplate,
                             CoverageService coverageService) {
        this.secretDetector = secretDetector;
        this.kafkaTemplate = kafkaTemplate;
        this.coverageService = coverageService;
    }

    @KafkaListener(topics = Topics.INTERNAL_EVENTS, groupId = "internal-scanner")
    public void onRepoEvent(RepoEvent event) {
        int scanned = 0;
        int skipped = 0;
        if (event.files() != null) {
            for (RepoEvent.FileChange file : event.files()) {
                if (file.content() == null || file.content().isBlank()) {
                    skipped++;
                    continue;
                }
                scanned++;
                secretDetector.scan(event, file).forEach(c ->
                        kafkaTemplate.send(Topics.DLP_CANDIDATES, c.candidateId(), c));
            }
        }
        coverageService.record(event.tenantId(), event.repoId(), scanned, skipped);
    }
}
