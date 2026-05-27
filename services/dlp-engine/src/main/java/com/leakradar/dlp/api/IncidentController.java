package com.leakradar.dlp.api;

import com.leakradar.dlp.service.IncidentQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentQueryService queryService;

    public IncidentController(IncidentQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader("X-Tenant-Id") String tenantId,
                                          @RequestHeader(value = "X-User-Id", required = false) String userId,
                                          @RequestHeader(value = "X-User-Role", required = false) String role,
                                          @RequestParam(defaultValue = "open") String status) {
        return queryService.listIncidents(tenantId, userId, role, status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@RequestHeader("X-Tenant-Id") String tenantId,
                                                   @PathVariable UUID id) {
        return queryService.getIncident(tenantId, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Void> update(@RequestHeader("X-Tenant-Id") String tenantId,
                                       @RequestHeader(value = "X-User-Id", required = false) String userId,
                                       @PathVariable UUID id,
                                       @RequestBody Map<String, String> body) {
        queryService.updateIncident(tenantId, id, body, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(@RequestHeader("X-Tenant-Id") String tenantId) {
        return queryService.stats(tenantId);
    }
}
