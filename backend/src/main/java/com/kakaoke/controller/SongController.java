package com.kakaoke.controller;

import com.kakaoke.dto.ImportResultDto;
import com.kakaoke.dto.LyricTimelineDto;
import com.kakaoke.dto.SongDto;
import com.kakaoke.dto.SongPageDto;
import com.kakaoke.dto.SongUpdateDto;
import com.kakaoke.security.AuthUtil;
import com.kakaoke.service.SongService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/songs")
public class SongController {

    private final SongService songService;

    public SongController(SongService songService) {
        this.songService = songService;
    }

    @GetMapping
    public SongPageDto getSongs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String edition,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(defaultValue = "title") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        size = Math.max(1, Math.min(100, size));
        page = Math.max(0, page);
        return songService.getSongs(AuthUtil.currentUserId(), search, genre, edition, language, year,
                favorite, sortBy, sortOrder, page, size);
    }

    @GetMapping("/{songId}")
    public SongDto getSongById(@PathVariable String songId) {
        return songService.getSongById(AuthUtil.currentUserId(), songId);
    }

    @GetMapping("/{songId}/lyrics")
    public LyricTimelineDto getLyricTimeline(@PathVariable String songId) {
        return songService.getLyricTimeline(songId);
    }

    @PutMapping("/{songId}")
    public SongDto updateSong(@PathVariable String songId, @RequestBody SongUpdateDto update) {
        return songService.updateSong(AuthUtil.currentUserId(), songId, update);
    }

    @DeleteMapping("/{songId}")
    public ResponseEntity<Void> deleteSong(@PathVariable String songId) {
        songService.removeFromLibrary(AuthUtil.currentUserId(), songId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{songId}/played")
    public ResponseEntity<Void> markPlayed(@PathVariable String songId) {
        songService.markPlayed(AuthUtil.currentUserId(), songId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{songId}/favorite")
    public ResponseEntity<Void> addFavorite(@PathVariable String songId) {
        songService.setFavorite(AuthUtil.currentUserId(), songId, true);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{songId}/favorite")
    public ResponseEntity<Void> removeFavorite(@PathVariable String songId) {
        songService.setFavorite(AuthUtil.currentUserId(), songId, false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<ImportResultDto> importSong(@RequestParam("file") MultipartFile file) throws IOException {
        ImportResultDto result = songService.importSongs(AuthUtil.currentUserId(), file.getInputStream());
        return ResponseEntity.status(201).body(result);
    }
}
