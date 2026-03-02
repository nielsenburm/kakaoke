package com.kakaoke.entity;

import java.io.Serializable;
import java.util.Objects;

public class UserSongId implements Serializable {

    private Long userId;
    private String songId;

    public UserSongId() {}

    public UserSongId(Long userId, String songId) {
        this.userId = userId;
        this.songId = songId;
    }

    public Long getUserId() { return userId; }
    public String getSongId() { return songId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserSongId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(songId, that.songId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, songId);
    }
}
