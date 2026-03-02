package com.kakaoke.controller;

import com.kakaoke.dto.AuthResponse;
import com.kakaoke.dto.LoginRequest;
import com.kakaoke.dto.RegisterRequest;
import com.kakaoke.dto.UserDto;
import com.kakaoke.security.AuthUtil;
import com.kakaoke.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        AuthResponse response = userService.register(request.username(), request.password());
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = userService.login(request.username(), request.password());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public UserDto me() {
        return userService.getUserDto(AuthUtil.currentUserId());
    }
}
