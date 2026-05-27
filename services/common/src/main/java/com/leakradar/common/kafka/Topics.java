package com.leakradar.common.kafka;

public final class Topics {
    public static final String INTERNAL_EVENTS = "internal.events";
    public static final String POLICY_CANDIDATES = "policy.candidates";
    public static final String POLICY_EXTERNAL_CANDIDATES = "policy.external.candidates";
    public static final String POLICY_CANDIDATES_CLASSIFIED = "policy.candidates.classified";
    public static final String POLICY_INCIDENTS = "policy.incidents";
    public static final String NOTIFICATIONS_OUTBOUND = "notifications.outbound";

    private Topics() {}
}
