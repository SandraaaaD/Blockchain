package com.hackathon.escrow.repository;

import com.hackathon.escrow.model.Project;
import com.hackathon.escrow.model.User;
import com.hackathon.escrow.model.enums.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByDeveloper(User developer);
    List<Project> findByClient(User client);
    List<Project> findByClientEmailAndStatus(String clientEmail, ProjectStatus status);
    List<Project> findByDeveloperOrClient(User developer, User client);
}
