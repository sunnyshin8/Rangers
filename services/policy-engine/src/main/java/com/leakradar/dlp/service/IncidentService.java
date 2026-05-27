package com.leakradar.policyengine.service;

import com.leakradar.common.events.ExternalLeakCandidate;
import com.leakradar.common.events.LeakCandidate;
import com.leakradar.common.events.LeakIncidentEvent;
import com.leakradar.common.kafka.Topics;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class IncidentService {

    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final CorrelationService correlationService;

    public IncidentService(JdbcTemplate jdbc, KafkaTemplate<String, Object> kafkaTemplate,
                           CorrelationService correlationService) {
        this.jdbc = jdbc;
        this.kafkaTemplate = kafkaTemplate;
        this.correlationService = correlationService;
    }

    public void createOrUpdateFromCandidate(LeakCandidate c) {
        UUID incidentId = findOpenByFingerprint(c.tenantId(), c.fingerprint());
        if (incidentId == null) {
            incidentId = UUID.randomUUID();
            String title = "Potential " + c.type() + " leak in " + (c.filePath() != null ? c.filePath() : "repository");
            jdbc.update(
                    """
                    INSERT INTO leak_incidents (id, tenant_id, title, severity, status, source, repo_id, summary)
                    VALUES (?::uuid, ?::uuid, ?, ?, 'open', 'internal', ?::uuid, ?)
                    """,
                    incidentId, c.tenantId(), title, c.severity(), c.repoId(),
                    "Detected rule: " + c.ruleId() + " (confidence " + c.confidence() + ")");
        }
        try {
            jdbc.update(
                    """
                    INSERT INTO leak_candidates (id, tenant_id, incident_id, source, candidate_type, rule_id,
                        confidence, severity, repo_id, file_path, line_start, line_end, masked_snippet,
                        fingerprint, commit_sha, ml_label, ml_confidence)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    UUID.fromString(c.candidateId()), c.tenantId(), incidentId, c.source(), c.type(), c.ruleId(),
                    c.confidence(), c.severity(), c.repoId(), c.filePath(), c.lineStart(), c.lineEnd(),
                    c.maskedSnippet(), c.fingerprint(), c.commitSha(), c.mlLabel(), c.mlConfidence());
        } catch (Exception ignored) {
            // duplicate candidate id
        }

        correlationService.tryCorrelateInternal(c.tenantId(), UUID.fromString(c.candidateId()), c.fingerprint());
        publishIncident(incidentId, c.tenantId(), "internal");
    }

    public void createFromExternal(ExternalLeakCandidate c) {
        UUID incidentId = findOpenByFingerprint(c.tenantId(), c.fingerprint());
        if (incidentId == null) {
            incidentId = UUID.randomUUID();
            jdbc.update(
                    """
                    INSERT INTO leak_incidents (id, tenant_id, title, severity, status, source, summary)
                    VALUES (?::uuid, ?::uuid, ?, ?, 'open', 'external', ?)
                    """,
                    incidentId, c.tenantId(),
                    "External leak on " + c.siteType(),
                    c.severity(),
                    "URL: " + c.url());
        }
        UUID extId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO external_candidates (id, tenant_id, incident_id, url, site_type, snippet_hash,
                    masked_snippet, fingerprint, confidence, severity)
                VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?)
                """,
                extId, c.tenantId(), incidentId, c.url(), c.siteType(), c.snippetHash(),
                c.maskedSnippet(), c.fingerprint(), c.confidence(), c.severity());

        correlationService.tryCorrelateExternal(c.tenantId(), extId, c.fingerprint());
        publishIncident(incidentId, c.tenantId(), "external");
    }

    private UUID findOpenByFingerprint(String tenantId, String fingerprint) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT i.id FROM leak_incidents i
                JOIN leak_candidates c ON c.incident_id = i.id
                WHERE i.tenant_id = ?::uuid AND c.fingerprint = ? AND i.status = 'open'
                LIMIT 1
                """,
                tenantId, fingerprint);
        if (rows.isEmpty()) return null;
        return (UUID) rows.get(0).get("id");
    }

    private void publishIncident(UUID incidentId, String tenantId, String source) {
        kafkaTemplate.send(Topics.POLICY_INCIDENTS, incidentId.toString(), new LeakIncidentEvent(
                incidentId, tenantId, "Leak incident", "high", "open", source, null, null, Instant.now()));
    }
}
