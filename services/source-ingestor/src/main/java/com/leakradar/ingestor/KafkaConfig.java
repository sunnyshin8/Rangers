package com.leakradar.ingestor;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic internalEvents() {
        return TopicBuilder.name("internal.events").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic dlpCandidates() {
        return TopicBuilder.name("policy.candidates").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic dlpExternalCandidates() {
        return TopicBuilder.name("policy.external.candidates").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic dlpCandidatesClassified() {
        return TopicBuilder.name("policy.candidates.classified").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic dlpIncidents() {
        return TopicBuilder.name("policy.incidents").partitions(3).replicas(1).build();
    }
}
