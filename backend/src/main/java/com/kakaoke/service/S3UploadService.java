package com.kakaoke.service;

import com.kakaoke.entity.SongStatus;
import com.kakaoke.repository.SongJpaRepository;
import com.kakaoke.storage.StorageProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.util.Map;

@Service
public class S3UploadService {

    private static final Logger log = LoggerFactory.getLogger(S3UploadService.class);

    private final StorageProvider storage;
    private final SongJpaRepository songRepo;

    public S3UploadService(StorageProvider storage, SongJpaRepository songRepo) {
        this.storage = storage;
        this.songRepo = songRepo;
    }

    /**
     * Upload files to storage in the background. Updates the song status
     * to READY on success, or BROKEN on failure.
     */
    @Async("s3UploadExecutor")
    @Transactional
    public void uploadFilesAsync(String songId, String storageDir, Map<String, byte[]> files) {
        log.info("Starting async upload for song '{}': {} files", songId, files.size());
        try {
            for (var entry : files.entrySet()) {
                storage.storeFile(storageDir, entry.getKey(),
                        new ByteArrayInputStream(entry.getValue()));
                log.debug("Uploaded {}/{} ({} bytes)", storageDir, entry.getKey(),
                        entry.getValue().length);
            }

            songRepo.findById(songId).ifPresent(entity -> {
                entity.setStatus(SongStatus.READY);
                songRepo.save(entity);
                log.info("Async upload complete for song '{}': status -> READY", songId);
            });
        } catch (Exception e) {
            log.error("Async upload failed for song '{}': {}", songId, e.getMessage(), e);
            songRepo.findById(songId).ifPresent(entity -> {
                entity.setStatus(SongStatus.BROKEN);
                songRepo.save(entity);
                log.warn("Song '{}' marked BROKEN after upload failure", songId);
            });
        }
    }
}
