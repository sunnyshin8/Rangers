package com.leakradar.common.events;

import java.time.Instant;
import java.util.List;

public record RepoEvent(
        String eventId,
        String tenantId,
        String repoId,
        String repoFullName,
        String eventType,
        String branch,
        String commitSha,
        String author,
        String commitMessage,
        Instant timestamp,
        List<FileChange> files
) {
    public record FileChange(String path, String content, String changeType) {}
}
