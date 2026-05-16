package com.hackathon.escrow.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "milestone_submissions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MilestoneSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    private String githubRepo;

    private String demoLink;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ElementCollection
    @CollectionTable(name = "submission_files", joinColumns = @JoinColumn(name = "submission_id"))
    @Column(name = "file_url")
    @Builder.Default
    private List<String> fileUrls = new ArrayList<>();

    @Column(updatable = false)
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}
