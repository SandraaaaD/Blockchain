package com.hackathon.escrow.service;

import com.hackathon.escrow.dto.response.MessageResponse;
import com.hackathon.escrow.model.Message;
import com.hackathon.escrow.model.Project;
import com.hackathon.escrow.model.User;
import com.hackathon.escrow.repository.MessageRepository;
import com.hackathon.escrow.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final MessageRepository messageRepository;
    private final ProjectRepository projectRepository;

    public List<MessageResponse> getMessages(Long projectId, User user) {
        Project project = findAndAuthorize(projectId, user);
        return messageRepository.findByProjectOrderByCreatedAtAsc(project)
                .stream().map(MessageResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public MessageResponse sendMessage(Long projectId, String content, MultipartFile file, User sender) throws IOException {
        Project project = findAndAuthorize(projectId, sender);

        Message message = Message.builder()
                .project(project)
                .sender(sender)
                .content(content)
                .build();

        if (file != null && !file.isEmpty()) {
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            file.transferTo(uploadDir.resolve(filename));
            message.setFileUrl("/uploads/" + filename);
            message.setFileName(file.getOriginalFilename());
        }

        return MessageResponse.from(messageRepository.save(message));
    }

    private Project findAndAuthorize(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        boolean isDeveloper = project.getDeveloper().getId().equals(user.getId());
        boolean isClient = project.getClient() != null && project.getClient().getId().equals(user.getId());
        if (!isDeveloper && !isClient) {
            throw new RuntimeException("Not authorized");
        }
        return project;
    }
}
