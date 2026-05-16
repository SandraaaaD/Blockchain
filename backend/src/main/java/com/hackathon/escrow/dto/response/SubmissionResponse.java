package com.hackathon.escrow.dto.response;

import com.hackathon.escrow.model.MilestoneSubmission;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class SubmissionResponse {
    private Long id;
    private String githubRepo;
    private String demoLink;
    private String notes;
    private List<String> fileUrls;
    private LocalDateTime submittedAt;

    public static SubmissionResponse from(MilestoneSubmission s) {
        SubmissionResponse r = new SubmissionResponse();
        r.setId(s.getId());
        r.setGithubRepo(s.getGithubRepo());
        r.setDemoLink(s.getDemoLink());
        r.setNotes(s.getNotes());
        r.setFileUrls(s.getFileUrls());
        r.setSubmittedAt(s.getSubmittedAt());
        return r;
    }
}
