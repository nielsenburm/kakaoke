package com.kakaoke.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kakaoke.dto.SettingsDto;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SettingsService {

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);

    private final Path settingsFile;
    private final ObjectMapper mapper = new ObjectMapper();
    private SettingsDto current = SettingsDto.DEFAULTS;

    public SettingsService(@Value("${kakaoke.settings.file:./settings.json}") String path) {
        this.settingsFile = Path.of(path);
    }

    @PostConstruct
    public void load() {
        if (Files.isRegularFile(settingsFile)) {
            try {
                current = mapper.readValue(settingsFile.toFile(), SettingsDto.class);
                log.info("Loaded settings from {}", settingsFile);
            } catch (IOException e) {
                log.warn("Failed to load settings, using defaults: {}", e.getMessage());
                current = SettingsDto.DEFAULTS;
            }
        }
    }

    public SettingsDto get() {
        return current;
    }

    public SettingsDto update(SettingsDto update) {
        // Validate ranges
        if (update.pitchTolerance() != null) {
            if (update.pitchTolerance() < 0.5 || update.pitchTolerance() > 4.0) {
                throw new IllegalArgumentException("pitchTolerance must be between 0.5 and 4.0");
            }
        }
        if (update.micSensitivity() != null) {
            if (update.micSensitivity() < 0.005 || update.micSensitivity() > 0.05) {
                throw new IllegalArgumentException("micSensitivity must be between 0.005 and 0.05");
            }
        }

        current = current.mergeWith(update);
        persist();
        return current;
    }

    private void persist() {
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(settingsFile.toFile(), current);
        } catch (IOException e) {
            log.error("Failed to persist settings to {}: {}", settingsFile, e.getMessage());
        }
    }
}
