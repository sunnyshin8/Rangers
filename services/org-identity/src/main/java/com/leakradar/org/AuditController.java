package com.leakradar.org;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final JdbcTemplate jdbc;

    public AuditController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader("X-Tenant-Id") String tenantId) {
        return jdbc.queryForList(
                """
                SELECT id, user_id, action, resource_type, resource_id, metadata, created_at
                FROM audit_logs WHERE tenant_id = ?::uuid ORDER BY created_at DESC LIMIT 100
                """,
                tenantId);
    }

    @PostMapping
    public void log(@RequestHeader("X-Tenant-Id") String tenantId,
                    @RequestHeader(value = "X-User-Id", required = false) String userId,
                    @RequestBody Map<String, Object> body) {
        jdbc.update(
                """
                INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata)
                VALUES (?::uuid, ?::uuid, ?, ?, ?::uuid, ?::jsonb)
                """,
                tenantId,
                userId != null ? UUID.fromString(userId) : null,
                body.get("action"),
                body.get("resourceType"),
                body.get("resourceId") != null ? UUID.fromString(body.get("resourceId").toString()) : null,
                body.get("metadata") != null ? body.get("metadata").toString() : "{}");
    }
}
