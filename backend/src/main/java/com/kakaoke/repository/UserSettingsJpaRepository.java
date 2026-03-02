package com.kakaoke.repository;

import com.kakaoke.entity.UserSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserSettingsJpaRepository extends JpaRepository<UserSettingsEntity, Long> {
}
