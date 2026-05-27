package com.leakradar.ingestor.repo;

import com.leakradar.common.events.RepoEvent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.UUID;

@Repository
public class RepoRepository {

    private final JdbcTemplate jdbc;

    public RepoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String findOrCreateRepoId(String tenantId, String fullName) {
        var existing = jdbc.queryForList(
                "SELECT id FROM repos WHERE tenant_id = ?::uuid AND full_name = ?",
                tenantId, fullName);
        if (!existing.isEmpty()) {
            return existing.get(0).get("id").toString();
        }
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO repos (id, tenant_id, full_name) VALUES (?::uuid, ?::uuid, ?)",
                id, tenantId, fullName);
        return id.toString();
    }

    public void saveInternalEvent(RepoEvent event) {
        jdbc.update(
                """
                INSERT INTO internal_events (tenant_id, repo_id, event_type, commit_sha, branch, author, payload)
                VALUES (?::uuid, ?::uuid, ?, ?, ?, ?, ?::jsonb)
                """,
                event.tenantId(),
                event.repoId(),
                event.eventType(),
                event.commitSha(),
                event.branch(),
                event.author(),
                "{\"eventId\":\"" + event.eventId() + "\"}"
        );
    }
}
