package com.kakaoke.controller;

import com.kakaoke.dto.SettingsDto;
import com.kakaoke.service.SettingsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public SettingsDto getSettings() {
        return settingsService.get();
    }

    @PutMapping
    public SettingsDto updateSettings(@RequestBody SettingsDto update) {
        return settingsService.update(update);
    }
}
