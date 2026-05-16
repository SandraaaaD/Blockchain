package com.hackathon.escrow.controller;

import com.hackathon.escrow.dto.request.CreateMilestoneRequest;
import com.hackathon.escrow.dto.request.CreateProjectRequest;
import com.hackathon.escrow.dto.request.ReviewRequest;
import com.hackathon.escrow.dto.request.SubmitMilestoneRequest;
import com.hackathon.escrow.dto.response.MilestoneResponse;
import com.hackathon.escrow.dto.response.ProjectResponse;
import com.hackathon.escrow.model.User;
import com.hackathon.escrow.service.ProjectService;
import com.hackathon.escrow.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.createProject(request, user));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getMyProjects(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.getMyProjects(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.getProject(id, user));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<ProjectResponse> respondToProject(
            @PathVariable Long id,
            @RequestParam boolean accept,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.respondToProject(id, accept, user));
    }

    @PutMapping("/{id}/requirements")
    public ResponseEntity<ProjectResponse> updateRequirements(
            @PathVariable Long id,
            @RequestBody List<String> requirements,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.addRequirements(id, requirements, user));
    }

    @PostMapping("/{id}/milestones")
    public ResponseEntity<MilestoneResponse> addMilestone(
            @PathVariable Long id,
            @Valid @RequestBody CreateMilestoneRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.addMilestone(id, request, user));
    }

    @PostMapping("/milestones/{milestoneId}/submit")
    public ResponseEntity<MilestoneResponse> submitMilestone(
            @PathVariable Long milestoneId,
            @RequestPart(value = "data") SubmitMilestoneRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @AuthenticationPrincipal User user) throws IOException {
        return ResponseEntity.ok(projectService.submitMilestone(milestoneId, request, files, user));
    }

    @PostMapping("/milestones/{milestoneId}/review")
    public ResponseEntity<MilestoneResponse> reviewMilestone(
            @PathVariable Long milestoneId,
            @RequestParam boolean approved,
            @RequestParam(required = false) String feedback,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.reviewMilestone(milestoneId, approved, feedback, user));
    }

    @PostMapping("/milestones/{milestoneId}/ai-decision")
    public ResponseEntity<MilestoneResponse> aiDecision(
            @PathVariable Long milestoneId,
            @RequestParam boolean approved,
            @RequestParam(required = false) String feedback) {
        return ResponseEntity.ok(projectService.aiDecision(milestoneId, approved, feedback));
    }

    @PostMapping("/{id}/fund")
    public ResponseEntity<ProjectResponse> markFunded(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectService.markFunded(id, user));
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<Map<String, String>> addReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal User user) {
        reviewService.addReview(id, request, user);
        return ResponseEntity.ok(Map.of("message", "Review submitted"));
    }
}
