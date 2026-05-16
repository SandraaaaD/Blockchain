package com.hackathon.escrow.service;

import com.hackathon.escrow.dto.request.ReviewRequest;
import com.hackathon.escrow.model.Project;
import com.hackathon.escrow.model.Review;
import com.hackathon.escrow.model.User;
import com.hackathon.escrow.model.enums.ProjectStatus;
import com.hackathon.escrow.repository.ProjectRepository;
import com.hackathon.escrow.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProjectRepository projectRepository;

    @Transactional
    public void addReview(Long projectId, ReviewRequest request, User reviewer) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (project.getStatus() != ProjectStatus.COMPLETED) {
            throw new RuntimeException("Project not completed yet");
        }

        boolean isDeveloper = project.getDeveloper().getId().equals(reviewer.getId());
        boolean isClient = project.getClient() != null && project.getClient().getId().equals(reviewer.getId());
        if (!isDeveloper && !isClient) {
            throw new RuntimeException("Not authorized");
        }

        if (reviewRepository.existsByProjectIdAndReviewerId(projectId, reviewer.getId())) {
            throw new RuntimeException("Review already submitted");
        }

        Review review = Review.builder()
                .project(project)
                .reviewer(reviewer)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        reviewRepository.save(review);
    }
}
