package com.kakaoke.dto;

import java.util.List;

public record LyricLineDto(
        double startMs,
        List<LyricTokenDto> tokens
) {}
