package com.kakaoke.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "songs")
public class SongEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String artist;

    private String genre;
    private String edition;
    private String creator;
    private Integer year;

    @Column(nullable = false)
    private double bpm;

    @Column(nullable = false)
    private double gap;

    private String language;
    private boolean duet;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "song_voice_names", joinColumns = @JoinColumn(name = "song_id"))
    @Column(name = "voice_name")
    @OrderColumn(name = "voice_index")
    private List<String> voiceNames;

    private Double previewStart;

    /** Storage directory name (e.g., "Queen - Bohemian Rhapsody") */
    @Column(nullable = false)
    private String storageDir;

    /** The UltraStar .txt filename within storageDir */
    @Column(nullable = false)
    private String txtFileName;

    /** Audio filename (resolved from #AUDIO or #MP3) — null if no audio */
    private String audioFileName;

    /** Cover filename — null if no cover */
    private String coverFileName;

    /** Background filename — null if no background */
    private String backgroundFileName;

    /** Video filename — null if no video */
    private String videoFileName;

    /** Video gap in seconds (delay relative to audio start) */
    private Double videoGap;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "song_tags", joinColumns = @JoinColumn(name = "song_id"))
    @Column(name = "tag")
    private List<String> tags;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SongStatus status = SongStatus.READY;

    /** Generated thumbnail filename (e.g., "thumbnail.jpg") — null if no cover */
    private String thumbnailFileName;

    /** SHA-256 hash of the .txt file content, used for deduplication on re-import */
    @Column(length = 64)
    private String contentHash;

    private boolean played;

    public SongEntity() {}

    // Getters and setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }

    public String getEdition() { return edition; }
    public void setEdition(String edition) { this.edition = edition; }

    public String getCreator() { return creator; }
    public void setCreator(String creator) { this.creator = creator; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public double getBpm() { return bpm; }
    public void setBpm(double bpm) { this.bpm = bpm; }

    public double getGap() { return gap; }
    public void setGap(double gap) { this.gap = gap; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public boolean isDuet() { return duet; }
    public void setDuet(boolean duet) { this.duet = duet; }

    public List<String> getVoiceNames() { return voiceNames; }
    public void setVoiceNames(List<String> voiceNames) { this.voiceNames = voiceNames; }

    public Double getPreviewStart() { return previewStart; }
    public void setPreviewStart(Double previewStart) { this.previewStart = previewStart; }

    public String getStorageDir() { return storageDir; }
    public void setStorageDir(String storageDir) { this.storageDir = storageDir; }

    public String getTxtFileName() { return txtFileName; }
    public void setTxtFileName(String txtFileName) { this.txtFileName = txtFileName; }

    public String getAudioFileName() { return audioFileName; }
    public void setAudioFileName(String audioFileName) { this.audioFileName = audioFileName; }

    public String getCoverFileName() { return coverFileName; }
    public void setCoverFileName(String coverFileName) { this.coverFileName = coverFileName; }

    public String getBackgroundFileName() { return backgroundFileName; }
    public void setBackgroundFileName(String backgroundFileName) { this.backgroundFileName = backgroundFileName; }

    public String getVideoFileName() { return videoFileName; }
    public void setVideoFileName(String videoFileName) { this.videoFileName = videoFileName; }

    public Double getVideoGap() { return videoGap; }
    public void setVideoGap(Double videoGap) { this.videoGap = videoGap; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public SongStatus getStatus() { return status; }
    public void setStatus(SongStatus status) { this.status = status; }

    public String getThumbnailFileName() { return thumbnailFileName; }
    public void setThumbnailFileName(String thumbnailFileName) { this.thumbnailFileName = thumbnailFileName; }

    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }

    public boolean isPlayed() { return played; }
    public void setPlayed(boolean played) { this.played = played; }
}
