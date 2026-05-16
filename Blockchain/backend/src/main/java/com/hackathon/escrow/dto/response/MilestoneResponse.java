package com.hackathon.escrow.dto.response;

import com.hackathon.escrow.model.Milestone;
import com.hackathon.escrow.model.enums.MilestoneStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class MilestoneResponse {
    private Long id;
    private String title;
    private String description;
    private BigDecimal amount;
    private Integer orderIndex;
    private MilestoneStatus status;
    private List<String> acceptanceCriteria;
    private SubmissionResponse submission;
    private String aiFeedback;
    private LocalDateTime createdAt;

    public static MilestoneResponse from(Milestone m) {
        MilestoneResponse r = new MilestoneResponse();
        r.setId(m.getId());
        r.setTitle(m.getTitle());
        r.setDescription(m.getDescription());
        r.setAmount(m.getAmount());
        r.setOrderIndex(m.getOrderIndex());
        r.setStatus(m.getStatus());
        r.setAiFeedback(m.getAiFeedback());
        r.setCreatedAt(m.getCreatedAt());
        r.setAcceptanceCriteria(
            m.getAcceptanceCriteria().stream()
                .map(ac -> ac.getDescription())
                .collect(Collectors.toList())
        );
        if (m.getSubmission() != null) {
            r.setSubmission(SubmissionResponse.from(m.getSubmission()));
        }
        return r;
    }
}
