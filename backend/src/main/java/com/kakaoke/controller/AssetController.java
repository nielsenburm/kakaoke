package com.kakaoke.controller;

import com.kakaoke.dto.ErrorDto;
import com.kakaoke.service.SongService;
import com.kakaoke.service.SongService.AssetInfo;
import com.kakaoke.storage.StorageProvider;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.net.URLConnection;
import java.util.Locale;

@RestController
@RequestMapping("/api/songs")
public class AssetController {

    private final SongService songService;

    public AssetController(SongService songService) {
        this.songService = songService;
    }

    @GetMapping("/{songId}/audio")
    public ResponseEntity<?> getAudio(
            @PathVariable String songId,
            @RequestHeader(value = "Range", required = false) String rangeHeader) throws IOException {

        AssetInfo info = songService.resolveAudio(songId);
        if (info == null) {
            return ResponseEntity.status(404)
                    .body(new ErrorDto(404, "Audio not found for song: " + songId));
        }

        StorageProvider storage = songService.getStorage();
        if (!storage.fileExists(info.dirName(), info.fileName())) {
            songService.onAssetMissing(songId);
            return ResponseEntity.status(404)
                    .body(new ErrorDto(404, "Audio file missing for song: " + songId));
        }
        long fileSize = storage.fileSize(info.dirName(), info.fileName());
        String contentType = guessMediaType(info.fileName(), "audio/mpeg");

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            return handleRangeRequest(storage, info, fileSize, rangeHeader, contentType);
        }

        InputStream is = storage.openFile(info.dirName(), info.fileName());
        return ResponseEntity.ok()
                .header("Accept-Ranges", "bytes")
                .header("Content-Length", String.valueOf(fileSize))
                .contentType(MediaType.parseMediaType(contentType))
                .body(new InputStreamResource(is));
    }

    @GetMapping("/{songId}/cover")
    public ResponseEntity<?> getCover(@PathVariable String songId) throws IOException {
        AssetInfo info = songService.resolveCover(songId);
        if (info == null) {
            return ResponseEntity.status(404)
                    .body(new ErrorDto(404, "Cover not found for song: " + songId));
        }

        return serveFile(songId, info, "image/jpeg");
    }

    @GetMapping("/{songId}/thumbnail")
    public ResponseEntity<?> getThumbnail(@PathVariable String songId) throws IOException {
        AssetInfo info = songService.resolveThumbnail(songId);
        if (info == null) {
            return ResponseEntity.status(404)
                    .body(new ErrorDto(404, "Thumbnail not found for song: " + songId));
        }

        return serveFile(songId, info, "image/jpeg");
    }

    @GetMapping("/{songId}/background")
    public ResponseEntity<?> getBackground(@PathVariable String songId) throws IOException {
        AssetInfo info = songService.resolveBackground(songId);
        if (info == null) {
            return ResponseEntity.status(404)
                    .body(new ErrorDto(404, "Background not found for song: " + songId));
        }

        return serveFile(songId, info, "image/jpeg");
    }

    private ResponseEntity<?> serveFile(String songId, AssetInfo info, String defaultType) throws IOException {
        StorageProvider storage = songService.getStorage();
        if (!storage.fileExists(info.dirName(), info.fileName())) {
            songService.onAssetMissing(songId);
            return ResponseEntity.notFound().build();
        }
        InputStream is = storage.openFile(info.dirName(), info.fileName());
        String contentType = guessMediaType(info.fileName(), defaultType);
        long size = storage.fileSize(info.dirName(), info.fileName());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        if (size >= 0) {
            headers.setContentLength(size);
        }

        return new ResponseEntity<>(new InputStreamResource(is), headers, HttpStatus.OK);
    }

    private ResponseEntity<?> handleRangeRequest(
            StorageProvider storage, AssetInfo info,
            long fileSize, String rangeHeader, String contentType) throws IOException {

        // Parse "bytes=start-end"
        String rangeSpec = rangeHeader.substring("bytes=".length()).trim();
        String[] parts = rangeSpec.split("-", 2);

        long start;
        long end;

        try {
            if (parts[0].isEmpty()) {
                // Suffix range: bytes=-500
                long suffix = Long.parseLong(parts[1]);
                start = Math.max(0, fileSize - suffix);
                end = fileSize - 1;
            } else if (parts.length == 1 || parts[1].isEmpty()) {
                // Open range: bytes=500-
                start = Long.parseLong(parts[0]);
                end = fileSize - 1;
            } else {
                start = Long.parseLong(parts[0]);
                end = Long.parseLong(parts[1]);
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.status(416)
                    .header("Content-Range", "bytes */" + fileSize)
                    .build();
        }

        if (start < 0 || start > end || start >= fileSize) {
            return ResponseEntity.status(416)
                    .header("Content-Range", "bytes */" + fileSize)
                    .build();
        }

        end = Math.min(end, fileSize - 1);
        long contentLength = end - start + 1;

        InputStream is = storage.openFile(info.dirName(), info.fileName());
        is.skip(start);
        InputStream limited = new LimitedInputStream(is, contentLength);

        return ResponseEntity.status(206)
                .header("Accept-Ranges", "bytes")
                .header("Content-Range", "bytes " + start + "-" + end + "/" + fileSize)
                .header("Content-Length", String.valueOf(contentLength))
                .contentType(MediaType.parseMediaType(contentType))
                .body(new InputStreamResource(limited));
    }

    private String guessMediaType(String fileName, String defaultType) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        String guess = URLConnection.guessContentTypeFromName(lower);
        if (guess != null) return guess;
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        return defaultType;
    }

    /** InputStream wrapper that limits reads to a max number of bytes. */
    private static class LimitedInputStream extends FilterInputStream {
        private long remaining;

        LimitedInputStream(InputStream in, long limit) {
            super(in);
            this.remaining = limit;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = super.read();
            if (b >= 0) remaining--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int toRead = (int) Math.min(len, remaining);
            int n = super.read(b, off, toRead);
            if (n > 0) remaining -= n;
            return n;
        }

        @Override
        public long skip(long n) throws IOException {
            long toSkip = Math.min(n, remaining);
            long skipped = super.skip(toSkip);
            remaining -= skipped;
            return skipped;
        }

        @Override
        public int available() throws IOException {
            return (int) Math.min(super.available(), remaining);
        }
    }

}
