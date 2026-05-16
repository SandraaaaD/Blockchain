package com.hackathon.escrow.controller;

import com.hackathon.escrow.dto.response.MessageResponse;
import com.hackathon.escrow.model.User;
import com.hackathon.escrow.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/{projectId}/messages")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getMessages(projectId, user));
    }

    @PostMapping("/{projectId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long projectId,
            @RequestParam("content") String content,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal User user) throws IOException {
        MessageResponse response = chatService.sendMessage(projectId, content, file, user);
        return ResponseEntity.ok(response);
    }
}
