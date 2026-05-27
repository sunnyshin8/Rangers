package com.leakradar.ingestor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leakradar.common.events.RepoEvent;
import com.leakradar.common.kafka.Topics;
import com.leakradar.ingestor.repo.RepoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class IngestService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final RepoRepository repoRepository;
    private final String defaultTenantId;

    public IngestService(KafkaTemplate<String, Object> kafkaTemplate,
                         ObjectMapper objectMapper,
                         RepoRepository repoRepository,
                         @Value("${leakradar.default-tenant-id}") String defaultTenantId) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.repoRepository = repoRepository;
        this.defaultTenantId = defaultTenantId;
    }

    public RepoEvent publishRepoEvent(RepoEvent event) {
        RepoEvent normalized = new RepoEvent(
                event.eventId() != null ? event.eventId() : UUID.randomUUID().toString(),
                event.tenantId() != null ? event.tenantId() : defaultTenantId,
                event.repoId() != null ? event.repoId() : repoRepository.findOrCreateRepoId(event.tenantId(), event.repoFullName()),
                event.repoFullName(),
                event.eventType(),
                event.branch(),
                event.commitSha(),
                event.author(),
                event.commitMessage(),
                event.timestamp() != null ? event.timestamp() : Instant.now(),
                event.files() != null ? event.files() : List.of()
        );
        kafkaTemplate.send(Topics.INTERNAL_EVENTS, normalized.eventId(), normalized);
        repoRepository.saveInternalEvent(normalized);
        return normalized;
    }

    public void ingestGitHubPayload(String eventType, String payload) throws Exception {
        JsonNode root = objectMapper.readTree(payload);
        String repoFullName = root.path("repository").path("full_name").asText("unknown/unknown");
        String branch = root.path("ref").asText("refs/heads/main").replace("refs/heads/", "");
        String commitSha = root.path("after").asText(root.path("pull_request").path("head").path("sha").asText(""));
        String author = root.path("pusher").path("name").asText(
                root.path("pull_request").path("user").path("login").asText("unknown"));
        String message = root.path("head_commit").path("message").asText("");

        List<RepoEvent.FileChange> files = new ArrayList<>();
        JsonNode commits = root.path("commits");
        if (commits.isArray()) {
            for (JsonNode commit : commits) {
                addFiles(files, commit.path("added"), "added");
                addFiles(files, commit.path("modified"), "modified");
            }
        }

        RepoEvent event = new RepoEvent(
                UUID.randomUUID().toString(),
                defaultTenantId,
                repoRepository.findOrCreateRepoId(defaultTenantId, repoFullName),
                repoFullName,
                "pull_request".equals(eventType) ? "pull_request" : "push",
                branch,
                commitSha,
                author,
                message,
                Instant.now(),
                files
        );
        publishRepoEvent(event);
    }

    private void addFiles(List<RepoEvent.FileChange> files, JsonNode paths, String changeType) {
        if (!paths.isArray()) return;
        for (JsonNode p : paths) {
            files.add(new RepoEvent.FileChange(p.asText(), "", changeType));
        }
    }
}
