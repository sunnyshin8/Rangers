package com.leakradar.scanner.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CoverageService {

    private final JdbcTemplate jdbc;

    public CoverageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(String tenantId, String repoId, int scanned, int skipped) {
        try {
            jdbc.update(
                    """
                    INSERT INTO scanner_coverage (tenant_id, repo_id, files_scanned, files_skipped, last_scan_at)
                    VALUES (?::uuid, ?::uuid, ?, ?, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    tenantId, repoId, scanned, skipped);
        } catch (Exception ignored) {
            // table may not exist before MVP4 migration
        }
    }
}
