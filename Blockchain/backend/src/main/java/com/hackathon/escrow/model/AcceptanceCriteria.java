package com.hackathon.escrow.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "acceptance_criteria")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcceptanceCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
}
