package com.leakradar.common.kafka;

public final class Topics {
    public static final String INTERNAL_EVENTS = "internal.events";
    public static final String DLP_CANDIDATES = "dlp.candidates";
    public static final String DLP_EXTERNAL_CANDIDATES = "dlp.external.candidates";
    public static final String DLP_CANDIDATES_CLASSIFIED = "dlp.candidates.classified";
    public static final String DLP_INCIDENTS = "dlp.incidents";
    public static final String NOTIFICATIONS_OUTBOUND = "notifications.outbound";

    private Topics() {}
}
