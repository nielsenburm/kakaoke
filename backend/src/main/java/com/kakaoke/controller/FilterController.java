package com.kakaoke.controller;

import com.kakaoke.security.AuthUtil;
import com.kakaoke.service.SongService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/filters")
public class FilterController {

    private final SongService songService;

    public FilterController(SongService songService) {
        this.songService = songService;
    }

    @GetMapping("/genres")
    public List<String> getGenres() {
        return songService.getGenres(AuthUtil.currentUserId());
    }

    @GetMapping("/editions")
    public List<String> getEditions() {
        return songService.getEditions(AuthUtil.currentUserId());
    }

    @GetMapping("/languages")
    public List<String> getLanguages() {
        return songService.getLanguages(AuthUtil.currentUserId());
    }

    @GetMapping("/tags")
    public List<String> getTags() {
        return songService.getTags(AuthUtil.currentUserId());
    }
}
