package com.leakradar.scanner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;

@EnableKafka
@SpringBootApplication
public class InternalScannerApplication {
    public static void main(String[] args) {
        SpringApplication.run(InternalScannerApplication.class, args);
    }
}
