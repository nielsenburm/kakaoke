package com.kakaoke.service;

import com.kakaoke.dto.AuthResponse;
import com.kakaoke.dto.UserDto;
import com.kakaoke.entity.UserEntity;
import com.kakaoke.entity.UserSettingsEntity;
import com.kakaoke.repository.UserJpaRepository;
import com.kakaoke.repository.UserSettingsJpaRepository;
import com.kakaoke.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserJpaRepository userRepo;
    private final UserSettingsJpaRepository settingsRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(UserJpaRepository userRepo,
                       UserSettingsJpaRepository settingsRepo,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepo = userRepo;
        this.settingsRepo = settingsRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(String username, String password) {
        if (username == null || username.isBlank() || username.length() < 3 || username.length() > 50) {
            throw new IllegalArgumentException("Username must be 3-50 characters");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        if (userRepo.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already taken");
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setAdmin(false);
        userRepo.save(user);

        // Create default settings for the new user
        UserSettingsEntity settings = new UserSettingsEntity();
        settings.setUser(user);
        settingsRepo.save(settings);

        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.isAdmin());
        return new AuthResponse(token, toUserDto(user));
    }

    public AuthResponse login(String username, String password) {
        UserEntity user = userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.isAdmin());
        return new AuthResponse(token, toUserDto(user));
    }

    public UserDto getUserDto(Long userId) {
        UserEntity user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return toUserDto(user);
    }

    private UserDto toUserDto(UserEntity user) {
        return new UserDto(user.getId(), user.getUsername(), user.isAdmin());
    }
}
