package com.leakradar.common.events;

import java.time.Instant;
import java.util.UUID;

public record LeakIncidentEvent(
        UUID incidentId,
        String tenantId,
        String title,
        String severity,
        String status,
        String source,
        UUID repoId,
        String summary,
        Instant timestamp
) {}
