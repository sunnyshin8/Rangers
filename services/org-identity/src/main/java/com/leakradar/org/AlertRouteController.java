package com.leakradar.org;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/alert-routes")
public class AlertRouteController {

    private final JdbcTemplate jdbc;

    public AlertRouteController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader("X-Tenant-Id") String tenantId) {
        return jdbc.queryForList(
                "SELECT id, name, channel_type, config, severity_threshold, enabled, created_at FROM alert_routes WHERE tenant_id = ?::uuid ORDER BY created_at DESC",
                tenantId);
    }

    @PostMapping
    public void create(@RequestHeader("X-Tenant-Id") String tenantId,
                       @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String channelType = (String) body.get("channelType");
        String configJson = (String) body.getOrDefault("configJson", "{}");
        String severityThreshold = (String) body.getOrDefault("severityThreshold", "medium");
        Boolean enabled = (Boolean) body.getOrDefault("enabled", true);

        jdbc.update(
                """
                INSERT INTO alert_routes (tenant_id, name, channel_type, config, severity_threshold, enabled)
                VALUES (?::uuid, ?, ?, ?::jsonb, ?, ?)
                """,
                tenantId, name, channelType, configJson, severityThreshold, enabled);
    }

    @PutMapping("/{id}")
    public void update(@RequestHeader("X-Tenant-Id") String tenantId,
                       @PathVariable("id") String id,
                       @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String channelType = (String) body.get("channelType");
        String configJson = (String) body.getOrDefault("configJson", "{}");
        String severityThreshold = (String) body.getOrDefault("severityThreshold", "medium");
        Boolean enabled = (Boolean) body.get("enabled");

        jdbc.update(
                """
                UPDATE alert_routes
                SET name = ?, channel_type = ?, config = ?::jsonb, severity_threshold = ?, enabled = ?
                WHERE id = ?::uuid AND tenant_id = ?::uuid
                """,
                name, channelType, configJson, severityThreshold, enabled, id, tenantId);
    }

    @DeleteMapping("/{id}")
    public void delete(@RequestHeader("X-Tenant-Id") String tenantId,
                       @PathVariable("id") String id) {
        jdbc.update(
                "DELETE FROM alert_routes WHERE id = ?::uuid AND tenant_id = ?::uuid",
                id, tenantId);
    }
}
