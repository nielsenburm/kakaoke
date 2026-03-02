package com.kakaoke.repository;

import com.kakaoke.entity.UserSongEntity;
import com.kakaoke.entity.UserSongId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserSongJpaRepository extends JpaRepository<UserSongEntity, UserSongId> {

    @Query("SELECT us FROM UserSongEntity us JOIN FETCH us.song WHERE us.userId = :userId")
    List<UserSongEntity> findByUserId(@Param("userId") Long userId);

    Optional<UserSongEntity> findByUserIdAndSongId(Long userId, String songId);

    boolean existsByUserIdAndSongId(Long userId, String songId);

    void deleteByUserIdAndSongId(Long userId, String songId);

    @Query("SELECT DISTINCT s.genre FROM UserSongEntity us JOIN us.song s " +
           "WHERE us.userId = :userId AND s.genre IS NOT NULL AND s.genre <> '' ORDER BY s.genre")
    List<String> findDistinctGenresByUserId(@Param("userId") Long userId);

    @Query("SELECT DISTINCT s.edition FROM UserSongEntity us JOIN us.song s " +
           "WHERE us.userId = :userId AND s.edition IS NOT NULL AND s.edition <> '' ORDER BY s.edition")
    List<String> findDistinctEditionsByUserId(@Param("userId") Long userId);

    @Query("SELECT DISTINCT s.language FROM UserSongEntity us JOIN us.song s " +
           "WHERE us.userId = :userId AND s.language IS NOT NULL AND s.language <> '' ORDER BY s.language")
    List<String> findDistinctLanguagesByUserId(@Param("userId") Long userId);

    @Query("SELECT DISTINCT t FROM UserSongEntity us JOIN us.song s JOIN s.tags t " +
           "WHERE us.userId = :userId ORDER BY t")
    List<String> findDistinctTagsByUserId(@Param("userId") Long userId);
}
