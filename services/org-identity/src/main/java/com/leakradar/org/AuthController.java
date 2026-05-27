package com.leakradar.org;

import com.leakradar.org.service.AuthService;
import com.leakradar.org.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody Map<String, String> body) {
        return authService.authenticate(body.get("email"), body.get("password"))
                .<ResponseEntity<Object>>map(user -> ResponseEntity.ok(Map.of(
                        "token", jwtService.createToken(user),
                        "user", user)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "Invalid username or password")));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        return jwtService.parse(auth.substring(7))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }
}
