package com.kakaoke.dto;

public record SettingsDto(
        Double pitchTolerance,
        Double micSensitivity,
        Boolean showPitchIndicator,
        Boolean autoPreview,
        Boolean autoPlay,
        Boolean showBackground,
        String lyricsPosition
) {
    public static final SettingsDto DEFAULTS = new SettingsDto(2.0, 0.01, true, true, true, true, "bottom");

    public SettingsDto mergeWith(SettingsDto update) {
        return new SettingsDto(
                update.pitchTolerance() != null ? update.pitchTolerance() : this.pitchTolerance(),
                update.micSensitivity() != null ? update.micSensitivity() : this.micSensitivity(),
                update.showPitchIndicator() != null ? update.showPitchIndicator() : this.showPitchIndicator(),
                update.autoPreview() != null ? update.autoPreview() : this.autoPreview(),
                update.autoPlay() != null ? update.autoPlay() : this.autoPlay(),
                update.showBackground() != null ? update.showBackground() : this.showBackground(),
                update.lyricsPosition() != null ? update.lyricsPosition() : this.lyricsPosition()
        );
    }
}
