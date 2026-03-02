package com.kakaoke.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record SongDto(
        String id,
        String title,
        String artist,
        String genre,
        String edition,
        String creator,
        Integer year,
        double bpm,
        double gap,
        String language,
        boolean duet,
        List<String> voiceNames,
        Double previewStart,
        String coverUrl,
        String thumbnailUrl,
        String backgroundUrl,
        String audioUrl,
        String videoUrl,
        Double videoGap,
        List<String> tags,
        String status,
        boolean played
) {}
