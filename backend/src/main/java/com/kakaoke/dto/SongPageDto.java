package com.kakaoke.dto;

import java.util.List;

public record SongPageDto(
        List<SongDto> content,
        long totalElements,
        int totalPages,
        int page,
        int size
) {}
