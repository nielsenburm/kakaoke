package com.kakaoke.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_settings")
public class UserSettingsEntity {

    @Id
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(nullable = false)
    private double pitchTolerance = 2.0;

    @Column(nullable = false)
    private double micSensitivity = 0.01;

    @Column(nullable = false)
    private boolean showPitchIndicator = true;

    @Column(nullable = false)
    private boolean autoPreview = true;

    @Column(nullable = false)
    private boolean autoPlay = true;

    @Column(nullable = false)
    private boolean showBackground = true;

    @Column(nullable = false, length = 10)
    private String lyricsPosition = "bottom";

    public UserSettingsEntity() {}

    public Long getUserId() { return userId; }

    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }

    public double getPitchTolerance() { return pitchTolerance; }
    public void setPitchTolerance(double pitchTolerance) { this.pitchTolerance = pitchTolerance; }

    public double getMicSensitivity() { return micSensitivity; }
    public void setMicSensitivity(double micSensitivity) { this.micSensitivity = micSensitivity; }

    public boolean isShowPitchIndicator() { return showPitchIndicator; }
    public void setShowPitchIndicator(boolean showPitchIndicator) { this.showPitchIndicator = showPitchIndicator; }

    public boolean isAutoPreview() { return autoPreview; }
    public void setAutoPreview(boolean autoPreview) { this.autoPreview = autoPreview; }

    public boolean isAutoPlay() { return autoPlay; }
    public void setAutoPlay(boolean autoPlay) { this.autoPlay = autoPlay; }

    public boolean isShowBackground() { return showBackground; }
    public void setShowBackground(boolean showBackground) { this.showBackground = showBackground; }

    public String getLyricsPosition() { return lyricsPosition; }
    public void setLyricsPosition(String lyricsPosition) { this.lyricsPosition = lyricsPosition; }
}
