package com.leakradar.policyengine;

import com.leakradar.common.events.LeakCandidate;
import com.leakradar.common.kafka.Topics;
import com.leakradar.policyengine.service.IncidentService;
import com.leakradar.policyengine.service.PolicyEngine;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "leakradar.ml-pipeline-enabled", havingValue = "false", matchIfMissing = true)
public class RawCandidateListener {

    private final PolicyEngine policyEngine;
    private final IncidentService incidentService;

    public RawCandidateListener(PolicyEngine policyEngine, IncidentService incidentService) {
        this.policyEngine = policyEngine;
        this.incidentService = incidentService;
    }

    @KafkaListener(topics = Topics.POLICY_CANDIDATES, groupId = "dlp-engine")
    public void onInternal(LeakCandidate candidate) {
        LeakCandidate evaluated = policyEngine.apply(candidate);
        if (evaluated != null) {
            incidentService.createOrUpdateFromCandidate(evaluated);
        }
    }
}
