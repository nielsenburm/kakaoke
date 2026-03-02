package com.kakaoke.service;

import com.kakaoke.dto.SettingsDto;
import com.kakaoke.entity.UserSettingsEntity;
import com.kakaoke.repository.UserSettingsJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final UserSettingsJpaRepository settingsRepo;

    public SettingsService(UserSettingsJpaRepository settingsRepo) {
        this.settingsRepo = settingsRepo;
    }

    public SettingsDto get(Long userId) {
        UserSettingsEntity entity = settingsRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Settings not found"));
        return toDto(entity);
    }

    @Transactional
    public SettingsDto update(Long userId, SettingsDto update) {
        UserSettingsEntity entity = settingsRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Settings not found"));

        if (update.pitchTolerance() != null) {
            if (update.pitchTolerance() < 0.5 || update.pitchTolerance() > 4.0) {
                throw new IllegalArgumentException("pitchTolerance must be between 0.5 and 4.0");
            }
            entity.setPitchTolerance(update.pitchTolerance());
        }
        if (update.micSensitivity() != null) {
            if (update.micSensitivity() < 0.005 || update.micSensitivity() > 0.05) {
                throw new IllegalArgumentException("micSensitivity must be between 0.005 and 0.05");
            }
            entity.setMicSensitivity(update.micSensitivity());
        }
        if (update.showPitchIndicator() != null) entity.setShowPitchIndicator(update.showPitchIndicator());
        if (update.autoPreview() != null) entity.setAutoPreview(update.autoPreview());
        if (update.autoPlay() != null) entity.setAutoPlay(update.autoPlay());
        if (update.showBackground() != null) entity.setShowBackground(update.showBackground());
        if (update.lyricsPosition() != null) {
            if (!"center".equals(update.lyricsPosition()) && !"bottom".equals(update.lyricsPosition())) {
                throw new IllegalArgumentException("lyricsPosition must be 'center' or 'bottom'");
            }
            entity.setLyricsPosition(update.lyricsPosition());
        }

        settingsRepo.save(entity);
        return toDto(entity);
    }

    private SettingsDto toDto(UserSettingsEntity e) {
        return new SettingsDto(
                e.getPitchTolerance(), e.getMicSensitivity(), e.isShowPitchIndicator(),
                e.isAutoPreview(), e.isAutoPlay(), e.isShowBackground(), e.getLyricsPosition()
        );
    }
}
