package com.leakradar.policyengine;

import com.leakradar.common.events.ExternalLeakCandidate;
import com.leakradar.common.kafka.Topics;
import com.leakradar.policyengine.service.IncidentService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class CandidateConsumer {

    private final IncidentService incidentService;

    public CandidateConsumer(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @KafkaListener(topics = Topics.POLICY_EXTERNAL_CANDIDATES, groupId = "dlp-engine-external")
    public void onExternal(ExternalLeakCandidate candidate) {
        incidentService.createFromExternal(candidate);
    }
}
