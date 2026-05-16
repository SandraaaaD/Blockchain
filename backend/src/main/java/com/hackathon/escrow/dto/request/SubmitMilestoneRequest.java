package com.hackathon.escrow.dto.request;

import lombok.Data;

@Data
public class SubmitMilestoneRequest {
    private String githubRepo;
    private String demoLink;
    private String notes;
}
