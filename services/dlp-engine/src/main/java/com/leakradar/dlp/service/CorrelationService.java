package com.leakradar.dlp.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CorrelationService {

    private final JdbcTemplate jdbc;

    public CorrelationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void tryCorrelateInternal(String tenantId, UUID internalCandidateId, String fingerprint) {
        tryCorrelate(tenantId, internalCandidateId, null, fingerprint);
    }

    public void tryCorrelateExternal(String tenantId, UUID externalCandidateId, String fingerprint) {
        tryCorrelate(tenantId, null, externalCandidateId, fingerprint);
    }

    private void tryCorrelate(String tenantId, UUID internalId, UUID externalId, String fingerprint) {
        try {
            List<Map<String, Object>> internal = jdbc.queryForList(
                    "SELECT id, incident_id FROM leak_candidates WHERE tenant_id = ?::uuid AND fingerprint = ?",
                    tenantId, fingerprint);
            List<Map<String, Object>> external = jdbc.queryForList(
                    "SELECT id, incident_id FROM external_candidates WHERE tenant_id = ?::uuid AND fingerprint = ?",
                    tenantId, fingerprint);
            if (internal.isEmpty() || external.isEmpty()) return;

            UUID intCand = internalId != null ? internalId : (UUID) internal.get(0).get("id");
            UUID extCand = externalId != null ? externalId : (UUID) external.get(0).get("id");
            UUID incidentId = (UUID) internal.get(0).get("incident_id");
            if (incidentId == null) incidentId = (UUID) external.get(0).get("incident_id");

            jdbc.update(
                    "UPDATE leak_incidents SET source = 'correlated', updated_at = NOW() WHERE id = ?::uuid",
                    incidentId);

            jdbc.update(
                    """
                    INSERT INTO incident_correlations (tenant_id, incident_id, internal_candidate_id,
                        external_candidate_id, correlation_type, score)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?::uuid, 'fingerprint', 0.95)
                    """,
                    tenantId, incidentId, intCand, extCand);
        } catch (Exception ignored) {
        }
    }
}
