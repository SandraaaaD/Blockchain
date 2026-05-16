package com.hackathon.escrow.repository;

import com.hackathon.escrow.model.Milestone;
import com.hackathon.escrow.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    List<Milestone> findByProjectOrderByOrderIndexAsc(Project project);
}
