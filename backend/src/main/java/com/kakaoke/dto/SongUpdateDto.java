package com.kakaoke.dto;

import java.util.List;

public record SongUpdateDto(
        String title,
        String artist,
        String genre,
        String edition,
        String creator,
        Integer year,
        String language,
        List<String> tags
) {}
