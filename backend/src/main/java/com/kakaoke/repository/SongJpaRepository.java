package com.kakaoke.repository;

import com.kakaoke.entity.SongEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SongJpaRepository extends JpaRepository<SongEntity, String> {

    @Query("SELECT DISTINCT s.genre FROM SongEntity s WHERE s.genre IS NOT NULL AND s.genre <> '' ORDER BY s.genre")
    List<String> findDistinctGenres();

    @Query("SELECT DISTINCT s.edition FROM SongEntity s WHERE s.edition IS NOT NULL AND s.edition <> '' ORDER BY s.edition")
    List<String> findDistinctEditions();

    @Query("SELECT DISTINCT s.language FROM SongEntity s WHERE s.language IS NOT NULL AND s.language <> '' ORDER BY s.language")
    List<String> findDistinctLanguages();

    @Query("SELECT DISTINCT t FROM SongEntity s JOIN s.tags t ORDER BY t")
    List<String> findDistinctTags();

    Optional<SongEntity> findByContentHash(String contentHash);
}
