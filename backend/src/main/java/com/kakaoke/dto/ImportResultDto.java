package com.kakaoke.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record ImportResultDto(
        List<ImportEntry> results
) {
    public record ImportEntry(
            SongDto song,
            String error
    ) {
        public static ImportEntry success(SongDto song) {
            return new ImportEntry(song, null);
        }

        public static ImportEntry failure(String error) {
            return new ImportEntry(null, error);
        }
    }
}
