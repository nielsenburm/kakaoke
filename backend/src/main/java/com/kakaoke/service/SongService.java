package com.kakaoke.service;

import com.kakaoke.dto.*;
import com.kakaoke.entity.SongEntity;
import com.kakaoke.entity.SongStatus;
import com.kakaoke.exception.ImportException;
import com.kakaoke.exception.SongNotFoundException;
import com.kakaoke.parser.UltraStarParser;
import com.kakaoke.parser.UltraStarParser.*;
import com.kakaoke.repository.SongJpaRepository;
import com.kakaoke.storage.StorageProvider;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class SongService {

    private static final Logger log = LoggerFactory.getLogger(SongService.class);

    private final StorageProvider storage;
    private final SongJpaRepository songRepo;
    private final ThumbnailService thumbnailService;
    private final S3UploadService s3UploadService;
    private final UltraStarParser parser = new UltraStarParser();

    public SongService(StorageProvider storage, SongJpaRepository songRepo,
                       ThumbnailService thumbnailService, S3UploadService s3UploadService) {
        this.storage = storage;
        this.songRepo = songRepo;
        this.thumbnailService = thumbnailService;
        this.s3UploadService = s3UploadService;
    }

    @PostConstruct
    @Transactional
    public void verifyStorageIntegrity() {
        List<SongEntity> all = songRepo.findAll();
        if (all.isEmpty()) return;

        log.info("Verifying storage integrity for {} songs...", all.size());
        int brokenCount = 0;
        int fixedCount = 0;

        for (SongEntity song : all) {
            boolean dirty = false;

            // Stuck PROCESSING songs: server restarted during async upload
            if (song.getStatus() == SongStatus.PROCESSING) {
                song.setStatus(SongStatus.BROKEN);
                dirty = true;
                log.warn("Song '{}' was still PROCESSING at startup — marked BROKEN",
                        song.getId());
            }

            // The .txt file is essential — if missing, the song is broken
            boolean txtExists = fileExists(song.getStorageDir(), song.getTxtFileName());
            if (!txtExists) {
                if (song.getStatus() != SongStatus.BROKEN) {
                    song.setStatus(SongStatus.BROKEN);
                    dirty = true;
                    log.warn("Song '{}' marked broken: .txt file missing ({}/{})",
                            song.getId(), song.getStorageDir(), song.getTxtFileName());
                }
                brokenCount++;
            } else {
                // .txt exists — song can recover from BROKEN
                if (song.getStatus() == SongStatus.BROKEN) {
                    song.setStatus(SongStatus.READY);
                    dirty = true;
                    fixedCount++;
                    log.info("Song '{}' recovered: .txt file found", song.getId());
                }

                // Check individual asset files — null out references to missing files
                if (song.getAudioFileName() != null
                        && !fileExists(song.getStorageDir(), song.getAudioFileName())) {
                    log.warn("Song '{}': audio file missing ({}), clearing reference",
                            song.getId(), song.getAudioFileName());
                    song.setAudioFileName(null);
                    dirty = true;
                }
                if (song.getCoverFileName() != null
                        && !fileExists(song.getStorageDir(), song.getCoverFileName())) {
                    log.warn("Song '{}': cover file missing ({}), clearing reference",
                            song.getId(), song.getCoverFileName());
                    song.setCoverFileName(null);
                    dirty = true;
                }
                if (song.getBackgroundFileName() != null
                        && !fileExists(song.getStorageDir(), song.getBackgroundFileName())) {
                    log.warn("Song '{}': background file missing ({}), clearing reference",
                            song.getId(), song.getBackgroundFileName());
                    song.setBackgroundFileName(null);
                    dirty = true;
                }
            }

            // Backfill content hash for existing songs
            if (song.getContentHash() == null && song.getStatus() == SongStatus.READY) {
                try (InputStream is = storage.openFile(song.getStorageDir(), song.getTxtFileName())) {
                    song.setContentHash(sha256(is.readAllBytes()));
                    dirty = true;
                } catch (Exception e) {
                    log.debug("Failed to backfill hash for song '{}': {}", song.getId(), e.getMessage());
                }
            }

            if (dirty) {
                songRepo.save(song);
            }
        }

        log.info("Storage integrity check complete: {} total, {} broken, {} recovered",
                all.size(), brokenCount, fixedCount);
    }

    private boolean fileExists(String dir, String fileName) {
        try {
            return storage.fileExists(dir, fileName);
        } catch (Exception e) {
            log.debug("Error checking file existence: {}/{}: {}", dir, fileName, e.getMessage());
            return false;
        }
    }

    // --- Public API ---

    public SongPageDto getSongs(String search, String genre, String edition,
                                String language, Integer year,
                                String sortBy, String sortOrder,
                                int page, int size) {
        Stream<SongEntity> stream = songRepo.findAll().stream();

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase(Locale.ROOT);
            stream = stream.filter(s ->
                    s.getTitle().toLowerCase(Locale.ROOT).contains(q) ||
                    s.getArtist().toLowerCase(Locale.ROOT).contains(q));
        }
        if (genre != null && !genre.isBlank()) {
            stream = stream.filter(s -> genre.equalsIgnoreCase(s.getGenre()));
        }
        if (edition != null && !edition.isBlank()) {
            stream = stream.filter(s -> edition.equalsIgnoreCase(s.getEdition()));
        }
        if (language != null && !language.isBlank()) {
            stream = stream.filter(s -> language.equalsIgnoreCase(s.getLanguage()));
        }
        if (year != null) {
            stream = stream.filter(s -> year.equals(s.getYear()));
        }

        Comparator<SongEntity> comparator = switch (sortBy != null ? sortBy : "title") {
            case "artist" -> Comparator.comparing(s -> s.getArtist().toLowerCase(Locale.ROOT));
            case "year" -> Comparator.comparing(s -> s.getYear() != null ? s.getYear() : 0);
            default -> Comparator.comparing(s -> s.getTitle().toLowerCase(Locale.ROOT));
        };
        if ("desc".equalsIgnoreCase(sortOrder)) {
            comparator = comparator.reversed();
        }

        List<SongEntity> filtered = stream.sorted(comparator).toList();
        long totalElements = filtered.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / size));

        List<SongDto> content = filtered.stream()
                .skip((long) page * size)
                .limit(size)
                .map(this::toSongDto)
                .toList();

        return new SongPageDto(content, totalElements, totalPages, page, size);
    }

    public SongDto getSongById(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        return toSongDto(entity);
    }

    @Transactional
    public SongDto updateSong(String songId, SongUpdateDto update) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));

        if (update.title() != null && !update.title().isBlank()) entity.setTitle(update.title());
        if (update.artist() != null && !update.artist().isBlank()) entity.setArtist(update.artist());
        if (update.genre() != null) entity.setGenre(update.genre().isBlank() ? null : update.genre());
        if (update.edition() != null) entity.setEdition(update.edition().isBlank() ? null : update.edition());
        if (update.creator() != null) entity.setCreator(update.creator().isBlank() ? null : update.creator());
        if (update.language() != null) entity.setLanguage(update.language().isBlank() ? null : update.language());
        entity.setYear(update.year());
        if (update.tags() != null) entity.setTags(update.tags().isEmpty() ? null : update.tags());

        songRepo.save(entity);
        log.info("Updated song metadata: {} (id={})", entity.getTitle(), songId);
        return toSongDto(entity);
    }

    @Transactional
    public void deleteSong(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));

        try {
            storage.deleteDirectory(entity.getStorageDir());
            log.info("Deleted storage for song '{}': {}", songId, entity.getStorageDir());
        } catch (Exception e) {
            log.warn("Failed to delete storage for song '{}': {}", songId, e.getMessage());
        }

        songRepo.delete(entity);
        log.info("Deleted song from DB: {} - {} (id={})", entity.getArtist(), entity.getTitle(), songId);
    }

    public LyricTimelineDto getLyricTimeline(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        return buildTimelineFromStorage(entity);
    }

    public List<String> getGenres() {
        return songRepo.findDistinctGenres();
    }

    public List<String> getEditions() {
        return songRepo.findDistinctEditions();
    }

    public List<String> getLanguages() {
        return songRepo.findDistinctLanguages();
    }

    public List<String> getTags() {
        return songRepo.findDistinctTags();
    }

    @Transactional
    public SongDto importSong(InputStream zipStream) throws IOException {
        // Extract ZIP into memory
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipInputStream zis = new ZipInputStream(zipStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                String name = entry.getName();
                int lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
                String fileName = lastSlash >= 0 ? name.substring(lastSlash + 1) : name;
                if (fileName.isEmpty()) continue;
                if (fileName.startsWith(".") || name.contains("__MACOSX")) continue;
                entries.put(fileName, zis.readAllBytes());
            }
        } catch (Exception e) {
            throw new ImportException("Invalid ZIP archive: " + e.getMessage(), e);
        }

        // Find the .txt file
        List<String> txtFiles = entries.keySet().stream()
                .filter(f -> f.toLowerCase(Locale.ROOT).endsWith(".txt"))
                .toList();
        if (txtFiles.isEmpty()) {
            throw new ImportException("No .txt UltraStar file found in the archive");
        }
        if (txtFiles.size() > 1) {
            throw new ImportException("Multiple .txt files found in the archive — expected exactly one");
        }

        String txtFileName = txtFiles.getFirst();
        byte[] txtData = entries.get(txtFileName);

        // Parse the UltraStar file
        ParsedFile parsed;
        try {
            parsed = parser.parse(new ByteArrayInputStream(txtData));
        } catch (Exception e) {
            throw new ImportException("Failed to parse UltraStar file: " + e.getMessage(), e);
        }

        Headers h = parsed.headers();
        String contentHash = sha256(txtData);
        String dirName = h.artist() + " - " + h.title();

        // Check for existing song: first by content hash, then by generated ID
        SongEntity entity = songRepo.findByContentHash(contentHash).orElse(null);
        if (entity == null) {
            String id = generateId(h.artist(), h.title());
            entity = songRepo.findById(id).orElse(null);
        }
        boolean reImport = entity != null;

        if (reImport) {
            // Already known and healthy — nothing to do
            if (entity.getStatus() == SongStatus.READY) {
                log.info("Song '{}' already exists and is READY — skipping re-import", entity.getId());
                return toSongDto(entity);
            }

            // Delete old storage (best-effort — may already be gone)
            try {
                storage.deleteDirectory(entity.getStorageDir());
            } catch (Exception e) {
                log.debug("Old storage cleanup for re-import '{}': {}", entity.getId(), e.getMessage());
            }
            log.info("Re-importing song '{}' ({})", entity.getId(),
                    entity.getContentHash() != null ? "hash match" : "id match");
        } else {
            entity = new SongEntity();
            entity.setId(generateId(h.artist(), h.title()));
        }

        // Resolve asset filenames
        String audioFile = h.resolvedAudioFile();
        String coverFile = h.cover();
        String bgFile = h.background();
        String videoFile = h.video();

        if (coverFile == null) {
            coverFile = findCoverInFiles(entries.keySet());
        }
        if (bgFile != null && bgFile.contains("..")) {
            bgFile = null;
        }
        if (videoFile != null && videoFile.contains("..")) {
            videoFile = null;
        }

        // Generate thumbnail from cover image
        String thumbnailFileName = null;
        if (coverFile != null && entries.containsKey(coverFile)) {
            ThumbnailService.Thumbnail thumb = thumbnailService.generate(entries.get(coverFile));
            if (thumb != null) {
                thumbnailFileName = "thumbnail.jpg";
                storage.storeFile(dirName, thumbnailFileName,
                        new ByteArrayInputStream(thumb.data()));
            }
        }

        // Detect duet
        boolean duet = false;
        List<String> voiceNamesList = null;
        if (h.voiceNames() != null && !h.voiceNames().isEmpty()) {
            duet = true;
            voiceNamesList = h.voiceNames().entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(Map.Entry::getValue)
                    .toList();
        } else {
            duet = parsed.events().stream().anyMatch(e -> e instanceof Event.VoiceChange);
        }

        // Upload .txt file synchronously (small, needed for lyrics immediately)
        storage.storeFile(dirName, txtFileName, new ByteArrayInputStream(txtData));

        // Update entity fields
        entity.setTitle(h.title());
        entity.setArtist(h.artist());
        entity.setGenre(h.genre());
        entity.setEdition(h.edition());
        entity.setCreator(h.creator());
        entity.setYear(h.year());
        entity.setBpm(h.bpm());
        entity.setGap(h.gap());
        entity.setLanguage(h.language());
        entity.setDuet(duet);
        entity.setVoiceNames(voiceNamesList);
        entity.setPreviewStart(h.previewStart());
        entity.setStorageDir(dirName);
        entity.setTxtFileName(txtFileName);
        entity.setAudioFileName(audioFile);
        entity.setCoverFileName(coverFile);
        entity.setBackgroundFileName(bgFile);
        entity.setVideoFileName(videoFile);
        entity.setVideoGap(h.videoGap());
        entity.setThumbnailFileName(thumbnailFileName);
        entity.setContentHash(contentHash);

        // Determine if we need async upload for remaining files
        Map<String, byte[]> asyncFiles = new LinkedHashMap<>(entries);
        asyncFiles.remove(txtFileName);
        asyncFiles.remove("thumbnail.jpg");

        if (asyncFiles.isEmpty()) {
            entity.setStatus(SongStatus.READY);
        } else {
            entity.setStatus(SongStatus.PROCESSING);
        }

        songRepo.save(entity);
        log.info("{} song: {} - {} (id={}, status={}, hash={})",
                reImport ? "Re-imported" : "Imported",
                h.artist(), h.title(), entity.getId(), entity.getStatus(), contentHash.substring(0, 12));

        // Fire async upload for remaining files (audio, cover, background, etc.)
        if (!asyncFiles.isEmpty()) {
            s3UploadService.uploadFilesAsync(entity.getId(), dirName, asyncFiles);
        }

        return toSongDto(entity);
    }

    // --- Asset resolution ---

    public record AssetInfo(String dirName, String fileName) {}

    public AssetInfo resolveAudio(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        if (entity.getAudioFileName() == null) return null;
        return new AssetInfo(entity.getStorageDir(), entity.getAudioFileName());
    }

    public AssetInfo resolveCover(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        if (entity.getCoverFileName() == null) return null;
        return new AssetInfo(entity.getStorageDir(), entity.getCoverFileName());
    }

    @Transactional
    public AssetInfo resolveThumbnail(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));

        if (entity.getThumbnailFileName() != null) {
            return new AssetInfo(entity.getStorageDir(), entity.getThumbnailFileName());
        }

        // Lazy backfill: generate thumbnail for existing songs with cover in storage
        if (entity.getCoverFileName() != null && entity.getStatus() == SongStatus.READY) {
            try {
                byte[] coverBytes = storage.openFile(
                        entity.getStorageDir(), entity.getCoverFileName()).readAllBytes();
                ThumbnailService.Thumbnail thumb = thumbnailService.generate(coverBytes);
                if (thumb != null) {
                    String thumbName = "thumbnail.jpg";
                    storage.storeFile(entity.getStorageDir(), thumbName,
                            new ByteArrayInputStream(thumb.data()));
                    entity.setThumbnailFileName(thumbName);
                    songRepo.save(entity);
                    log.info("Generated thumbnail for existing song '{}'", songId);
                    return new AssetInfo(entity.getStorageDir(), thumbName);
                }
            } catch (Exception e) {
                log.debug("Failed to backfill thumbnail for song '{}': {}", songId, e.getMessage());
            }
        }

        return null;
    }

    public AssetInfo resolveBackground(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        if (entity.getBackgroundFileName() == null) return null;
        return new AssetInfo(entity.getStorageDir(), entity.getBackgroundFileName());
    }

    public AssetInfo resolveVideo(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        if (entity.getVideoFileName() == null) return null;
        return new AssetInfo(entity.getStorageDir(), entity.getVideoFileName());
    }

    /**
     * Called when an asset file is not found in storage. Checks whether the
     * essential .txt file still exists — if not, marks the song as BROKEN.
     */
    @Transactional
    public void onAssetMissing(String songId) {
        songRepo.findById(songId).ifPresent(entity -> {
            if (entity.getStatus() == SongStatus.BROKEN) return;
            boolean txtExists = fileExists(entity.getStorageDir(), entity.getTxtFileName());
            if (!txtExists) {
                entity.setStatus(SongStatus.BROKEN);
                songRepo.save(entity);
                log.warn("Song '{}' marked BROKEN: .txt file missing in storage", songId);
            }
        });
    }

    @Transactional
    public void markPlayed(String songId) {
        SongEntity entity = songRepo.findById(songId)
                .orElseThrow(() -> new SongNotFoundException(songId));
        if (!entity.isPlayed()) {
            entity.setPlayed(true);
            songRepo.save(entity);
        }
    }

    public StorageProvider getStorage() {
        return storage;
    }

    // --- Private helpers ---

    private SongDto toSongDto(SongEntity e) {
        SongStatus status = e.getStatus();
        boolean ready = status == SongStatus.READY;

        String thumbnailUrl = e.getThumbnailFileName() != null
                ? "/api/songs/" + e.getId() + "/thumbnail" : null;

        return new SongDto(
                e.getId(),
                e.getTitle(),
                e.getArtist(),
                e.getGenre(),
                e.getEdition(),
                e.getCreator(),
                e.getYear(),
                e.getBpm(),
                e.getGap(),
                e.getLanguage(),
                e.isDuet(),
                e.getVoiceNames(),
                e.getPreviewStart(),
                ready && e.getCoverFileName() != null ? "/api/songs/" + e.getId() + "/cover" : null,
                thumbnailUrl,
                ready && e.getBackgroundFileName() != null ? "/api/songs/" + e.getId() + "/background" : null,
                ready && e.getAudioFileName() != null ? "/api/songs/" + e.getId() + "/audio" : null,
                ready && e.getVideoFileName() != null ? "/api/songs/" + e.getId() + "/video" : null,
                e.getVideoGap(),
                e.getTags(),
                status.name().toLowerCase(Locale.ROOT),
                e.isPlayed()
        );
    }

    private LyricTimelineDto buildTimelineFromStorage(SongEntity entity) {
        try (InputStream is = storage.openFile(entity.getStorageDir(), entity.getTxtFileName())) {
            ParsedFile parsed = parser.parse(is);
            return buildTimeline(entity.getId(), parsed.headers().bpm(), parsed.headers().gap(), parsed.events());
        } catch (IOException e) {
            log.error("Failed to read UltraStar file for timeline: {}", entity.getId(), e);
            throw new RuntimeException("Failed to build lyric timeline", e);
        }
    }

    private LyricTimelineDto buildTimeline(String songId, double bpm, double gap, List<Event> events) {
        List<LyricLineDto> lines = new ArrayList<>();
        List<LyricTokenDto> currentTokens = new ArrayList<>();

        for (Event event : events) {
            switch (event) {
                case Event.NoteEvent ne -> {
                    Note n = ne.note();
                    double startMs = UltraStarParser.beatToMs(n.beat(), bpm, gap);
                    double durationMs = UltraStarParser.beatDurationToMs(n.duration(), bpm);
                    currentTokens.add(new LyricTokenDto(
                            n.text(), startMs, durationMs, n.pitch(), n.noteType()));
                }
                case Event.LineBreak lb -> {
                    if (!currentTokens.isEmpty()) {
                        double lineStart = currentTokens.getFirst().startMs();
                        lines.add(new LyricLineDto(lineStart, List.copyOf(currentTokens)));
                        currentTokens.clear();
                    }
                }
                case Event.VoiceChange vc -> {
                    if (!currentTokens.isEmpty()) {
                        double lineStart = currentTokens.getFirst().startMs();
                        lines.add(new LyricLineDto(lineStart, List.copyOf(currentTokens)));
                        currentTokens.clear();
                    }
                }
                case Event.End e -> { /* flush below */ }
            }
        }

        if (!currentTokens.isEmpty()) {
            double lineStart = currentTokens.getFirst().startMs();
            lines.add(new LyricLineDto(lineStart, List.copyOf(currentTokens)));
        }

        return new LyricTimelineDto(songId, lines);
    }

    private String findCoverInFiles(Set<String> fileNames) {
        List<String> imageExts = List.of(".jpg", ".jpeg", ".png");
        for (String f : fileNames) {
            String lower = f.toLowerCase(Locale.ROOT);
            if (imageExts.stream().anyMatch(lower::endsWith) && lower.contains("cover")) {
                return f;
            }
        }
        for (String f : fileNames) {
            String lower = f.toLowerCase(Locale.ROOT);
            if (imageExts.stream().anyMatch(lower::endsWith) && !lower.contains("background")) {
                return f;
            }
        }
        return null;
    }

    static String sha256(byte[] data) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    static String generateId(String artist, String title) {
        return slugify(artist + "-" + title);
    }

    static String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }
}
