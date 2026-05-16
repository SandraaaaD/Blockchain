package com.hackathon.escrow.dto.response;

import com.hackathon.escrow.model.Project;
import com.hackathon.escrow.model.enums.ProjectStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class ProjectResponse {
    private Long id;
    private String title;
    private String description;
    private BigDecimal budget;
    private Integer deadlineDays;
    private ProjectStatus status;
    private UserResponse developer;
    private UserResponse client;
    private String clientEmail;
    private List<MilestoneResponse> milestones;
    private List<String> requirements;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectResponse from(Project p) {
        ProjectResponse r = new ProjectResponse();
        r.setId(p.getId());
        r.setTitle(p.getTitle());
        r.setDescription(p.getDescription());
        r.setBudget(p.getBudget());
        r.setDeadlineDays(p.getDeadlineDays());
        r.setStatus(p.getStatus());
        r.setClientEmail(p.getClientEmail());
        r.setDeveloper(UserResponse.from(p.getDeveloper()));
        if (p.getClient() != null) r.setClient(UserResponse.from(p.getClient()));
        r.setMilestones(p.getMilestones().stream().map(MilestoneResponse::from).collect(Collectors.toList()));
        r.setRequirements(p.getRequirements().stream().map(req -> req.getDescription()).collect(Collectors.toList()));
        r.setCreatedAt(p.getCreatedAt());
        r.setUpdatedAt(p.getUpdatedAt());
        return r;
    }
}
