package com.leakradar.common.events;

import java.time.Instant;

public record ExternalLeakCandidate(
        String candidateId,
        String tenantId,
        String url,
        String siteType,
        String maskedSnippet,
        String snippetHash,
        String fingerprint,
        double confidence,
        String severity,
        String ruleId,
        Instant timestamp
) {}
