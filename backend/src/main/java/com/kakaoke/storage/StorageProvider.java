package com.kakaoke.storage;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * Abstraction over song library storage. Implementations read from local filesystem or S3.
 * Each "song directory" is identified by its name (e.g., "Queen - Bohemian Rhapsody").
 */
public interface StorageProvider {

    /** List all song directory names in the library root. */
    List<String> listSongDirectories() throws IOException;

    /** List file names within a song directory. */
    List<String> listFiles(String songDir) throws IOException;

    /** Open an input stream for a file inside a song directory. */
    InputStream openFile(String songDir, String fileName) throws IOException;

    /** Get the byte size of a file (for Range request support). Returns -1 if unknown. */
    long fileSize(String songDir, String fileName) throws IOException;

    /** Store extracted song files (for import). */
    void storeFile(String songDir, String fileName, InputStream data) throws IOException;

    /** Check if a file exists in a song directory. */
    boolean fileExists(String songDir, String fileName) throws IOException;

    /** Delete an entire song directory and all its contents. */
    void deleteDirectory(String songDir) throws IOException;
}
