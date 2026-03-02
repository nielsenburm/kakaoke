package com.kakaoke.dto;

public record AuthResponse(
        String token,
        UserDto user
) {}
