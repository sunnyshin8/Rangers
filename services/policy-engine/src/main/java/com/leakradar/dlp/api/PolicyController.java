package com.leakradar.policyengine.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/policies")
public class PolicyController {

    private final JdbcTemplate jdbc;

    public PolicyController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader("X-Tenant-Id") String tenantId) {
        return jdbc.queryForList(
                "SELECT id, name, enabled, rules, severity_map, allowlist, updated_at FROM policies WHERE tenant_id = ?::uuid",
                tenantId);
    }

    @PutMapping("/{id}")
    public void update(@RequestHeader("X-Tenant-Id") String tenantId,
                       @PathVariable UUID id,
                       @RequestBody Map<String, Object> body) {
        jdbc.update(
                """
                UPDATE policies SET name = COALESCE(?, name), enabled = COALESCE(?, enabled),
                    rules = COALESCE(?::jsonb, rules), severity_map = COALESCE(?::jsonb, severity_map),
                    allowlist = COALESCE(?::jsonb, allowlist), updated_at = NOW()
                WHERE id = ?::uuid AND tenant_id = ?::uuid
                """,
                body.get("name"), body.get("enabled"), body.get("rules"),
                body.get("severity_map"), body.get("allowlist"), id, tenantId);
    }
}
