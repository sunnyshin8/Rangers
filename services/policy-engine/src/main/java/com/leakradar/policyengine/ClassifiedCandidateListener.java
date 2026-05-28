package com.leakradar.policyengine;

import com.leakradar.common.events.LeakCandidate;
import com.leakradar.common.kafka.Topics;
import com.leakradar.policyengine.service.IncidentService;
import com.leakradar.policyengine.service.PolicyEngine;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "leakradar.ml-pipeline-enabled", havingValue = "true")
public class ClassifiedCandidateListener {

    private final PolicyEngine policyEngine;
    private final IncidentService incidentService;

    public ClassifiedCandidateListener(PolicyEngine policyEngine, IncidentService incidentService) {
        this.policyEngine = policyEngine;
        this.incidentService = incidentService;
    }

    @KafkaListener(topics = Topics.POLICY_CANDIDATES_CLASSIFIED, groupId = "dlp-engine-classified")
    public void onClassified(LeakCandidate candidate) {
        LeakCandidate evaluated = policyEngine.apply(candidate);
        if (evaluated != null) {
            incidentService.createOrUpdateFromCandidate(evaluated);
        }
    }
}
