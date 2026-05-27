package com.leakradar.org.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${leakradar.jwt.secret}") String secret,
                      @Value("${leakradar.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String createToken(Map<String, Object> user) {
        return Jwts.builder()
                .subject(user.get("id").toString())
                .claim("tenantId", user.get("tenant_id").toString())
                .claim("email", user.get("email"))
                .claim("role", user.get("role"))
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public Optional<Map<String, Object>> parse(String token) {
        try {
            var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Optional.of(Map.of(
                    "id", claims.getSubject(),
                    "tenantId", claims.get("tenantId"),
                    "email", claims.get("email"),
                    "role", claims.get("role")));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
