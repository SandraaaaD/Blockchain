package com.hackathon.escrow.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "requirements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Requirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
}
