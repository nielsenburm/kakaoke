package com.kakaoke.dto;

public record LyricTokenDto(
        String text,
        double startMs,
        double durationMs,
        int pitch,
        String noteType
) {}
