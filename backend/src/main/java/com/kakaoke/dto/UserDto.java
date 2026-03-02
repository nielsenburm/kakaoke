package com.kakaoke.dto;

public record UserDto(
        Long id,
        String username,
        boolean admin
) {}
