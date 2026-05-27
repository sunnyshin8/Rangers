package com.leakradar.ingestor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;

@EnableKafka
@SpringBootApplication
public class SourceIngestorApplication {
    public static void main(String[] args) {
        SpringApplication.run(SourceIngestorApplication.class, args);
    }
}
