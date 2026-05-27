package com.leakradar.org;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private final JdbcTemplate jdbc;

    public IntegrationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader("X-Tenant-Id") String tenantId) {
        return jdbc.queryForList(
                "SELECT id, provider, status, created_at FROM integrations WHERE tenant_id = ?::uuid",
                tenantId);
    }

    @PostMapping
    public void upsert(@RequestHeader("X-Tenant-Id") String tenantId,
                       @RequestBody Map<String, String> body) {
        jdbc.update(
                """
                INSERT INTO integrations (tenant_id, provider, status)
                VALUES (?::uuid, ?, 'active')
                ON CONFLICT (tenant_id, provider) DO UPDATE SET status = 'active'
                """,
                tenantId, body.get("provider"));
    }

    @GetMapping("/bright-data")
    public Map<String, Object> brightData(@RequestHeader("X-Tenant-Id") String tenantId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT serp_enabled, unlocker_enabled, scraper_enabled, daily_query_cap, updated_at
                FROM bright_data_config WHERE tenant_id = ?::uuid
                """,
                tenantId);
        return rows.isEmpty() ? Map.of("configured", false) : Map.of("configured", true, "config", rows.get(0));
    }

    @PutMapping("/bright-data")
    public void saveBrightData(@RequestHeader("X-Tenant-Id") String tenantId,
                               @RequestBody Map<String, Object> body) {
        String apiKey = (String) body.get("apiKey");
        byte[] encrypted = apiKey != null ? apiKey.getBytes() : null;
        jdbc.update(
                """
                INSERT INTO bright_data_config (tenant_id, api_key_encrypted, serp_enabled, unlocker_enabled,
                    scraper_enabled, daily_query_cap, updated_at)
                VALUES (?::uuid, ?, COALESCE(?, true), COALESCE(?, true), COALESCE(?, true), COALESCE(?, 100), NOW())
                ON CONFLICT (tenant_id) DO UPDATE SET
                    api_key_encrypted = COALESCE(EXCLUDED.api_key_encrypted, bright_data_config.api_key_encrypted),
                    serp_enabled = EXCLUDED.serp_enabled,
                    unlocker_enabled = EXCLUDED.unlocker_enabled,
                    scraper_enabled = EXCLUDED.scraper_enabled,
                    daily_query_cap = EXCLUDED.daily_query_cap,
                    updated_at = NOW()
                """,
                tenantId, encrypted, body.get("serpEnabled"), body.get("unlockerEnabled"),
                body.get("scraperEnabled"), body.get("dailyQueryCap"));
    }

    @GetMapping("/watchlists")
    public List<Map<String, Object>> watchlists(@RequestHeader("X-Tenant-Id") String tenantId) {
        return jdbc.queryForList(
                "SELECT id, keyword, enabled, scan_interval_hours, last_scan_at FROM watchlists WHERE tenant_id = ?::uuid",
                tenantId);
    }

    @PostMapping("/watchlists")
    public void addWatchlist(@RequestHeader("X-Tenant-Id") String tenantId,
                             @RequestBody Map<String, Object> body) {
        jdbc.update(
                "INSERT INTO watchlists (tenant_id, keyword, enabled, scan_interval_hours) VALUES (?::uuid, ?, true, ?)",
                tenantId, body.get("keyword"), body.getOrDefault("scanIntervalHours", 24));
    }
}
