package com.leakradar.org.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public AuthService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void ensureDemoPasswords() {
        String hash = passwordEncoder.encode("demo-admin");
        jdbc.update("UPDATE users SET password_hash = ? WHERE email = 'admin@demo.local'", hash);
        jdbc.update("UPDATE users SET password_hash = ? WHERE email = 'user@demo.local'",
                passwordEncoder.encode("demo-user"));
    }

    public Optional<Map<String, Object>> authenticate(String email, String password) {
        List<Map<String, Object>> users = jdbc.queryForList(
                """
                SELECT u.id, u.tenant_id, u.email, u.role, u.display_name, u.password_hash, t.name as tenant_name
                FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = ?
                """,
                email);
        if (users.isEmpty()) return Optional.empty();
        Map<String, Object> user = users.get(0);
        String hash = (String) user.get("password_hash");
        if (!passwordEncoder.matches(password, hash)) {
            return Optional.empty();
        }
        user.remove("password_hash");
        return Optional.of(user);
    }
}
