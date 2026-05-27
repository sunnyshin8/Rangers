package com.leakradar.policyengine.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class IncidentQueryService {

    private final JdbcTemplate jdbc;

    public IncidentQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> listIncidents(String tenantId, String userId, String role, String status) {
        if ("admin".equalsIgnoreCase(role) || userId == null) {
            return jdbc.queryForList(
                    """
                    SELECT id, title, severity, status, source, repo_id, summary, created_at, updated_at
                    FROM leak_incidents WHERE tenant_id = ?::uuid AND (? = 'all' OR status = ?)
                    ORDER BY created_at DESC LIMIT 100
                    """,
                    tenantId, status, status);
        }
        return jdbc.queryForList(
                """
                SELECT DISTINCT i.id, i.title, i.severity, i.status, i.source, i.repo_id, i.summary, i.created_at, i.updated_at
                FROM leak_incidents i
                JOIN leak_candidates c ON c.incident_id = i.id
                JOIN team_repos tr ON tr.repo_id = c.repo_id
                JOIN team_members tm ON tm.team_id = tr.team_id
                WHERE i.tenant_id = ?::uuid AND tm.user_id = ?::uuid AND (? = 'all' OR i.status = ?)
                ORDER BY i.created_at DESC LIMIT 100
                """,
                tenantId, userId, status, status);
    }

    public Optional<Map<String, Object>> getIncident(String tenantId, UUID id) {
        List<Map<String, Object>> incidents = jdbc.queryForList(
                """
                SELECT id, title, severity, status, source, repo_id, summary, remediation, notes, created_at, updated_at
                FROM leak_incidents WHERE tenant_id = ?::uuid AND id = ?::uuid
                """,
                tenantId, id);
        if (incidents.isEmpty()) return Optional.empty();
        Map<String, Object> incident = new LinkedHashMap<>(incidents.get(0));
        incident.put("candidates", jdbc.queryForList(
                """
                SELECT id, candidate_type, rule_id, confidence, severity, file_path, line_start, line_end,
                       masked_snippet, fingerprint, commit_sha, ml_label, ml_confidence, created_at
                FROM leak_candidates WHERE incident_id = ?::uuid
                """,
                id));
        incident.put("externalCandidates", jdbc.queryForList(
                """
                SELECT id, url, site_type, masked_snippet, confidence, severity, created_at
                FROM external_candidates WHERE incident_id = ?::uuid
                """,
                id));
        return Optional.of(incident);
    }

    public void updateIncident(String tenantId, UUID id, Map<String, String> body, String userId) {
        jdbc.update(
                """
                UPDATE leak_incidents SET status = COALESCE(?, status), notes = COALESCE(?, notes),
                    remediation = COALESCE(?, remediation), updated_at = NOW()
                WHERE id = ?::uuid AND tenant_id = ?::uuid
                """,
                body.get("status"), body.get("notes"), body.get("remediation"), id, tenantId);

        if ("false_positive".equals(body.get("status")) && userId != null) {
            try {
                jdbc.update(
                        """
                        INSERT INTO feedback_events (tenant_id, incident_id, user_id, feedback_type, notes)
                        VALUES (?::uuid, ?::uuid, ?::uuid, 'false_positive', ?)
                        """,
                        tenantId, id, userId, body.get("notes"));
            } catch (Exception ignored) {
            }
        }
    }

    public Map<String, Object> stats(String tenantId) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("byStatus", jdbc.queryForList(
                "SELECT status, COUNT(*) as count FROM leak_incidents WHERE tenant_id = ?::uuid GROUP BY status",
                tenantId));
        stats.put("bySeverity", jdbc.queryForList(
                "SELECT severity, COUNT(*) as count FROM leak_incidents WHERE tenant_id = ?::uuid GROUP BY severity",
                tenantId));
        stats.put("bySource", jdbc.queryForList(
                "SELECT source, COUNT(*) as count FROM leak_incidents WHERE tenant_id = ?::uuid GROUP BY source",
                tenantId));
        try {
            stats.put("coverage", jdbc.queryForList(
                    "SELECT repo_id, files_scanned, files_skipped, last_scan_at FROM scanner_coverage WHERE tenant_id = ?::uuid",
                    tenantId));
        } catch (Exception e) {
            stats.put("coverage", List.of());
        }
        return stats;
    }
}
