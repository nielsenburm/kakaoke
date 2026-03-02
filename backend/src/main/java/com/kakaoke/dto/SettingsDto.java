package com.kakaoke.dto;

public record SettingsDto(
        Double pitchTolerance,
        Double micSensitivity,
        Boolean showPitchIndicator
) {
    public static final SettingsDto DEFAULTS = new SettingsDto(2.0, 0.01, true);

    public SettingsDto mergeWith(SettingsDto update) {
        return new SettingsDto(
                update.pitchTolerance() != null ? update.pitchTolerance() : this.pitchTolerance(),
                update.micSensitivity() != null ? update.micSensitivity() : this.micSensitivity(),
                update.showPitchIndicator() != null ? update.showPitchIndicator() : this.showPitchIndicator()
        );
    }
}
