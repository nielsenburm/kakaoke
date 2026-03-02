package com.kakaoke.entity;

public enum SongStatus {
    /** All files uploaded and available */
    READY,
    /** Song metadata saved, large files still uploading to storage in background */
    PROCESSING,
    /** Essential files missing or corrupt — needs re-upload */
    BROKEN
}
