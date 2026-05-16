package com.hackathon.escrow.repository;

import com.hackathon.escrow.model.Review;
import com.hackathon.escrow.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProject(Project project);
    boolean existsByProjectIdAndReviewerId(Long projectId, Long reviewerId);
}
