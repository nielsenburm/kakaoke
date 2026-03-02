package com.kakaoke.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;
import java.util.stream.Stream;

public class FileStorageProvider implements StorageProvider {

    private static final Logger log = LoggerFactory.getLogger(FileStorageProvider.class);

    private final Path root;

    public FileStorageProvider(Path root) {
        this.root = root.toAbsolutePath().normalize();
        log.info("File storage root: {}", this.root);
    }

    @Override
    public List<String> listSongDirectories() throws IOException {
        if (!Files.isDirectory(root)) {
            log.warn("Song library root does not exist: {}", root);
            return List.of();
        }
        try (Stream<Path> stream = Files.list(root)) {
            return stream
                    .filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .filter(name -> !name.startsWith("."))
                    .sorted()
                    .toList();
        }
    }

    @Override
    public List<String> listFiles(String songDir) throws IOException {
        Path dir = resolveSafe(songDir);
        if (!Files.isDirectory(dir)) return List.of();
        try (Stream<Path> stream = Files.list(dir)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .toList();
        }
    }

    @Override
    public InputStream openFile(String songDir, String fileName) throws IOException {
        Path file = resolveSafe(songDir, fileName);
        if (!Files.isRegularFile(file)) {
            throw new FileNotFoundException("File not found: " + songDir + "/" + fileName);
        }
        return new BufferedInputStream(Files.newInputStream(file));
    }

    @Override
    public long fileSize(String songDir, String fileName) throws IOException {
        Path file = resolveSafe(songDir, fileName);
        if (!Files.isRegularFile(file)) return -1;
        return Files.size(file);
    }

    @Override
    public void storeFile(String songDir, String fileName, InputStream data) throws IOException {
        Path dir = root.resolve(songDir);
        Files.createDirectories(dir);
        Path file = dir.resolve(fileName);
        // Guard against path traversal
        if (!file.normalize().startsWith(root)) {
            throw new IOException("Path traversal detected: " + fileName);
        }
        try (OutputStream out = Files.newOutputStream(file)) {
            data.transferTo(out);
        }
    }

    @Override
    public boolean fileExists(String songDir, String fileName) throws IOException {
        Path file = resolveSafe(songDir, fileName);
        return Files.isRegularFile(file);
    }

    @Override
    public void deleteDirectory(String songDir) throws IOException {
        Path dir = resolveSafe(songDir);
        if (!Files.isDirectory(dir)) {
            log.debug("Directory '{}' does not exist, nothing to delete", songDir);
            return;
        }

        Files.walkFileTree(dir, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path d, IOException exc) throws IOException {
                Files.delete(d);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    private Path resolveSafe(String songDir) {
        Path resolved = root.resolve(songDir).normalize();
        if (!resolved.startsWith(root)) {
            throw new SecurityException("Path traversal detected: " + songDir);
        }
        return resolved;
    }

    private Path resolveSafe(String songDir, String fileName) {
        Path resolved = root.resolve(songDir).resolve(fileName).normalize();
        if (!resolved.startsWith(root)) {
            throw new SecurityException("Path traversal detected: " + songDir + "/" + fileName);
        }
        return resolved;
    }
}
