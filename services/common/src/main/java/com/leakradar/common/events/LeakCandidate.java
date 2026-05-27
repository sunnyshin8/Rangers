package com.leakradar.common.events;

import java.time.Instant;

public record LeakCandidate(
        String candidateId,
        String tenantId,
        String source,
        String type,
        String ruleId,
        double confidence,
        String severity,
        String repoId,
        String filePath,
        Integer lineStart,
        Integer lineEnd,
        String maskedSnippet,
        String fingerprint,
        String commitSha,
        String eventId,
        String externalUrl,
        Instant timestamp,
        String mlLabel,
        Double mlConfidence
) {}
