package com.hackathon.escrow.dto.response;

import com.hackathon.escrow.model.Message;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageResponse {
    private Long id;
    private Long projectId;
    private UserResponse sender;
    private String content;
    private String fileUrl;
    private String fileName;
    private LocalDateTime createdAt;

    public static MessageResponse from(Message m) {
        MessageResponse r = new MessageResponse();
        r.setId(m.getId());
        r.setProjectId(m.getProject().getId());
        r.setSender(UserResponse.from(m.getSender()));
        r.setContent(m.getContent());
        r.setFileUrl(m.getFileUrl());
        r.setFileName(m.getFileName());
        r.setCreatedAt(m.getCreatedAt());
        return r;
    }
}
