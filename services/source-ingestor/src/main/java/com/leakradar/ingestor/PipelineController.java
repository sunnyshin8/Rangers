package com.leakradar.ingestor;

import com.leakradar.common.events.RepoEvent;
import com.leakradar.ingestor.service.IngestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pipeline")
public class PipelineController {

    private final IngestService ingestService;
    private final JdbcTemplate jdbc;
    private final String defaultTenantId;

    public PipelineController(IngestService ingestService, JdbcTemplate jdbc,
                              @Value("${leakradar.default-tenant-id}") String defaultTenantId) {
        this.ingestService = ingestService;
        this.jdbc = jdbc;
        this.defaultTenantId = defaultTenantId;
    }

    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> ingest(@RequestBody Map<String, String> body) {
        String tenantId = body.getOrDefault("tenantId", defaultTenantId);
        String repoFullName = body.getOrDefault("repoFullName", "demo-org/payments-api");
        String logExcerpt = body.getOrDefault("logExcerpt", "");

        jdbc.update(
                """
                INSERT INTO pipeline_events (tenant_id, pipeline_id, run_id, status, log_excerpt)
                VALUES (?::uuid, ?, ?, ?, ?)
                """,
                tenantId, body.get("pipelineId"), body.get("runId"), body.get("status"), logExcerpt);

        if (logExcerpt != null && !logExcerpt.isBlank()) {
            RepoEvent event = new RepoEvent(
                    UUID.randomUUID().toString(),
                    tenantId,
                    null,
                    repoFullName,
                    "pipeline",
                    "main",
                    body.getOrDefault("runId", "ci-run"),
                    "ci-system",
                    "CI pipeline log scan",
                    Instant.now(),
                    List.of(new RepoEvent.FileChange("ci.log", logExcerpt, "added", "pipeline://" + body.getOrDefault("runId", "ci-run"), null))
            );
            ingestService.publishRepoEvent(event);
        }
        return ResponseEntity.accepted().body(Map.of("status", "accepted"));
    }
}
