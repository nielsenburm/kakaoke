package com.kakaoke.dto;

import java.util.List;

public record LyricTimelineDto(
        String songId,
        List<LyricLineDto> lines
) {}
