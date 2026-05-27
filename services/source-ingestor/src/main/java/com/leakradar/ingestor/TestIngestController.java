package com.leakradar.ingestor;

import com.leakradar.common.events.RepoEvent;
import com.leakradar.ingestor.service.IngestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestIngestController {

    private final IngestService ingestService;

    public TestIngestController(IngestService ingestService) {
        this.ingestService = ingestService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<RepoEvent> ingest(@RequestBody RepoEvent event) {
        return ResponseEntity.ok(ingestService.publishRepoEvent(event));
    }
}
