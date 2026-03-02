package com.kakaoke.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_songs")
@IdClass(UserSongId.class)
public class UserSongEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "song_id")
    private String songId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", insertable = false, updatable = false)
    private SongEntity song;

    @Column(nullable = false)
    private boolean favorite = false;

    @Column(nullable = false)
    private boolean played = false;

    @Column(nullable = false)
    private Instant addedAt = Instant.now();

    public UserSongEntity() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getSongId() { return songId; }
    public void setSongId(String songId) { this.songId = songId; }

    public UserEntity getUser() { return user; }
    public SongEntity getSong() { return song; }

    public boolean isFavorite() { return favorite; }
    public void setFavorite(boolean favorite) { this.favorite = favorite; }

    public boolean isPlayed() { return played; }
    public void setPlayed(boolean played) { this.played = played; }

    public Instant getAddedAt() { return addedAt; }
    public void setAddedAt(Instant addedAt) { this.addedAt = addedAt; }
}
