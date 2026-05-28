package com.leakradar.ingestor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leakradar.common.events.RepoEvent;
import com.leakradar.common.kafka.Topics;
import com.leakradar.common.security.CryptoUtil;
import com.leakradar.ingestor.repo.RepoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class IngestService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final RepoRepository repoRepository;
    private final JdbcTemplate jdbc;
    private final String defaultTenantId;

    public IngestService(KafkaTemplate<String, Object> kafkaTemplate,
                         ObjectMapper objectMapper,
                         RepoRepository repoRepository,
                         JdbcTemplate jdbc,
                         @Value("${leakradar.default-tenant-id}") String defaultTenantId) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.repoRepository = repoRepository;
        this.jdbc = jdbc;
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

        String token = getGitHubToken(defaultTenantId);

        List<RepoEvent.FileChange> files = new ArrayList<>();
        JsonNode commits = root.path("commits");
        if (commits.isArray()) {
            for (JsonNode commit : commits) {
                JsonNode commitFiles = loadGitHubCommitFiles(token, repoFullName, commit.path("id").asText(commitSha), commit.path("url").asText(""));
                if (commitFiles.isArray() && commitFiles.size() > 0) {
                    addFilesFromCommitDetails(files, commitFiles, token, repoFullName, commit.path("id").asText(commitSha));
                } else {
                    addFiles(files, commit.path("added"), "added", token, repoFullName, commitSha, null);
                    addFiles(files, commit.path("modified"), "modified", token, repoFullName, commitSha, null);
                }
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

    private void addFiles(List<RepoEvent.FileChange> files, JsonNode paths, String changeType, String token, String repoFullName, String commitSha) {
        if (!paths.isArray()) return;
        for (JsonNode p : paths) {
            String path = p.asText();
            String content = "";
            if (token != null && !token.isBlank() && !"removed".equals(changeType)) {
                content = fetchGitHubFileContent(token, repoFullName, path, commitSha);
            }
            files.add(new RepoEvent.FileChange(path, content, changeType, buildGitHubSourceUrl(repoFullName, commitSha, path), null));
        }
    }

    private void addFiles(List<RepoEvent.FileChange> files, JsonNode paths, String changeType, String token, String repoFullName, String commitSha, String patch) {
        if (!paths.isArray()) return;
        for (JsonNode p : paths) {
            String path = p.asText();
            String content = "";
            if (token != null && !token.isBlank() && !"removed".equals(changeType)) {
                content = fetchGitHubFileContent(token, repoFullName, path, commitSha);
            }
            files.add(new RepoEvent.FileChange(path, content, changeType, buildGitHubSourceUrl(repoFullName, commitSha, path), patch));
        }
    }

    private void addFilesFromCommitDetails(List<RepoEvent.FileChange> files, JsonNode commitFiles, String token, String repoFullName, String commitSha) {
        if (!commitFiles.isArray()) return;
        for (JsonNode file : commitFiles) {
            String path = file.path("filename").asText("");
            if (path.isBlank()) continue;
            String changeType = file.path("status").asText("modified");
            String patch = file.path("patch").asText("");
            String content = "";
            if (!"removed".equals(changeType) && token != null && !token.isBlank()) {
                content = fetchGitHubFileContent(token, repoFullName, path, commitSha);
            }
            if (content.isBlank() && !patch.isBlank()) {
                content = patch;
            }
            files.add(new RepoEvent.FileChange(
                    path,
                    content,
                    changeType,
                    file.path("blob_url").asText(buildGitHubSourceUrl(repoFullName, commitSha, path)),
                    patch
            ));
        }
    }

    private JsonNode loadGitHubCommitFiles(String token, String repoFullName, String commitSha, String commitUrl) {
        try {
            if (token == null || token.isBlank()) {
                return objectMapper.createArrayNode();
            }
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            String cleanUrl = (commitUrl != null && !commitUrl.isBlank())
                    ? commitUrl
                    : "https://api.github.com/repos/" + repoFullName + "/commits/" + commitSha;

            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(URI.create(cleanUrl))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .header("User-Agent", "LeakRadar-Ingestor")
                    .GET()
                    .build();

            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return objectMapper.readTree(response.body()).path("files");
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch commit details for " + commitSha + ": " + e.getMessage());
        }
        return objectMapper.createArrayNode();
    }

    private String buildGitHubSourceUrl(String repoFullName, String commitSha, String path) {
        return "https://github.com/" + repoFullName + "/blob/" + commitSha + "/" + path;
    }

    private String getGitHubToken(String tenantId) {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT config_encrypted FROM integrations WHERE tenant_id = ?::uuid AND provider = 'github'",
                    tenantId);
            if (!rows.isEmpty() && rows.get(0).get("config_encrypted") != null) {
                byte[] encrypted = (byte[]) rows.get(0).get("config_encrypted");
                return CryptoUtil.decrypt(encrypted);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch or decrypt GitHub token: " + e.getMessage());
        }
        return null;
    }

    private String fetchGitHubFileContent(String token, String repoFullName, String path, String commitSha) {
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            String cleanUrl = "https://api.github.com/repos/" + repoFullName + "/contents/" + path.replace(" ", "%20") + "?ref=" + commitSha;

            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(URI.create(cleanUrl))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github.v3+json")
                    .header("User-Agent", "LeakRadar-Ingestor")
                    .GET()
                    .build();

            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode fileNode = objectMapper.readTree(response.body());
                String base64Content = fileNode.path("content").asText("").replaceAll("\\s", "");
                if (!base64Content.isEmpty()) {
                    byte[] decoded = Base64.getDecoder().decode(base64Content);
                    return new String(decoded, StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch file content for " + path + ": " + e.getMessage());
        }
        return "";
    }

    public void ingestGitLabPayload(String eventType, String payload) throws Exception {
        JsonNode root = objectMapper.readTree(payload);
        String repoFullName = root.path("project").path("path_with_namespace").asText("unknown/unknown");
        String branch = root.path("ref").asText("refs/heads/main").replace("refs/heads/", "");
        String commitSha = root.path("checkout_sha").asText("");
        String author = root.path("user_username").asText("unknown");
        
        List<RepoEvent.FileChange> files = new ArrayList<>();
        JsonNode commits = root.path("commits");
        if (commits.isArray()) {
            for (JsonNode commit : commits) {
                addFiles(files, commit.path("added"), "added", null, repoFullName, commitSha);
                addFiles(files, commit.path("modified"), "modified", null, repoFullName, commitSha);
            }
        }

        RepoEvent event = new RepoEvent(
                UUID.randomUUID().toString(),
                defaultTenantId,
                repoRepository.findOrCreateRepoId(defaultTenantId, repoFullName),
                repoFullName,
                "Push Hook".equals(eventType) ? "push" : "pull_request",
                branch,
                commitSha,
                author,
                "GitLab commit",
                Instant.now(),
                files
        );
        publishRepoEvent(event);
    }

    public void ingestBitbucketPayload(String eventType, String payload) throws Exception {
        JsonNode root = objectMapper.readTree(payload);
        String repoFullName = root.path("repository").path("full_name").asText("unknown/unknown");
        
        String branch = "main";
        String commitSha = "";
        String author = "unknown";
        String message = "Bitbucket push";
        
        JsonNode changes = root.path("push").path("changes");
        if (changes.isArray() && changes.size() > 0) {
            JsonNode chg = changes.get(0).path("new");
            branch = chg.path("name").asText("main");
            JsonNode target = chg.path("target");
            commitSha = target.path("hash").asText("");
            message = target.path("message").asText("Bitbucket push");
            author = target.path("author").path("raw").asText("unknown");
        }

        RepoEvent event = new RepoEvent(
                UUID.randomUUID().toString(),
                defaultTenantId,
                repoRepository.findOrCreateRepoId(defaultTenantId, repoFullName),
                repoFullName,
                "repo:push".equals(eventType) ? "push" : "pull_request",
                branch,
                commitSha,
                author,
                message,
                Instant.now(),
                List.of()
        );
        publishRepoEvent(event);
    }
}
