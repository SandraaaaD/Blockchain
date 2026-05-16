package com.hackathon.escrow.service;

import com.hackathon.escrow.dto.request.CreateMilestoneRequest;
import com.hackathon.escrow.dto.request.CreateProjectRequest;
import com.hackathon.escrow.dto.request.SubmitMilestoneRequest;
import com.hackathon.escrow.dto.response.MilestoneResponse;
import com.hackathon.escrow.dto.response.ProjectResponse;
import com.hackathon.escrow.model.*;
import com.hackathon.escrow.model.enums.MilestoneStatus;
import com.hackathon.escrow.model.enums.ProjectStatus;
import com.hackathon.escrow.repository.MilestoneRepository;
import com.hackathon.escrow.repository.ProjectRepository;
import com.hackathon.escrow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, User developer) {
        Project project = Project.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .budget(request.getBudget())
                .deadlineDays(request.getDeadlineDays())
                .developer(developer)
                .clientEmail(request.getClientEmail())
                .status(ProjectStatus.PENDING_CLIENT)
                .build();

        userRepository.findByEmail(request.getClientEmail())
                .ifPresent(project::setClient);

        return ProjectResponse.from(projectRepository.save(project));
    }

    public List<ProjectResponse> getMyProjects(User user) {
        List<Project> projects;
        switch (user.getRole()) {
            case DEVELOPER -> projects = projectRepository.findByDeveloper(user);
            case CLIENT -> projects = projectRepository.findByClient(user);
            default -> projects = new ArrayList<>();
        }
        return projects.stream().map(ProjectResponse::from).collect(Collectors.toList());
    }

    public ProjectResponse getProject(Long id, User user) {
        Project project = findAndAuthorize(id, user);
        return ProjectResponse.from(project);
    }

    @Transactional
    public ProjectResponse respondToProject(Long id, boolean accept, User client) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getClientEmail().equalsIgnoreCase(client.getEmail())) {
            throw new RuntimeException("Not authorized");
        }

        project.setClient(client);
        if (accept) {
            project.setStatus(ProjectStatus.ACTIVE);
        } else {
            project.setStatus(ProjectStatus.DECLINED);
        }

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse addRequirements(Long id, List<String> requirements, User user) {
        Project project = findAndAuthorize(id, user);

        project.getRequirements().clear();
        for (String desc : requirements) {
            Requirement req = Requirement.builder()
                    .project(project)
                    .description(desc)
                    .build();
            project.getRequirements().add(req);
        }

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public MilestoneResponse addMilestone(Long projectId, CreateMilestoneRequest request, User user) {
        Project project = findAndAuthorize(projectId, user);

        int nextIndex = project.getMilestones().size() + 1;

        Milestone milestone = Milestone.builder()
                .project(project)
                .title(request.getTitle())
                .description(request.getDescription())
                .amount(request.getAmount())
                .orderIndex(nextIndex)
                .status(MilestoneStatus.PENDING)
                .build();

        if (request.getAcceptanceCriteria() != null) {
            for (String criteria : request.getAcceptanceCriteria()) {
                AcceptanceCriteria ac = AcceptanceCriteria.builder()
                        .milestone(milestone)
                        .description(criteria)
                        .build();
                milestone.getAcceptanceCriteria().add(ac);
            }
        }

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    @Transactional
    public MilestoneResponse submitMilestone(Long milestoneId, SubmitMilestoneRequest request,
                                              List<MultipartFile> files, User user) throws IOException {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));

        if (!milestone.getProject().getDeveloper().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized");
        }

        MilestoneSubmission submission = new MilestoneSubmission();
        submission.setMilestone(milestone);
        submission.setGithubRepo(request.getGithubRepo());
        submission.setDemoLink(request.getDemoLink());
        submission.setNotes(request.getNotes());

        if (files != null && !files.isEmpty()) {
            List<String> fileUrls = saveFiles(files);
            submission.setFileUrls(fileUrls);
        }

        milestone.setSubmission(submission);
        milestone.setStatus(MilestoneStatus.SUBMITTED);

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    @Transactional
    public MilestoneResponse reviewMilestone(Long milestoneId, boolean approved, String feedback, User client) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));

        if (!milestone.getProject().getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Not authorized");
        }

        if (approved) {
            milestone.setStatus(MilestoneStatus.CLIENT_APPROVED);
            activateNextMilestone(milestone);
        } else {
            milestone.setStatus(MilestoneStatus.AI_REVIEW);
        }

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    @Transactional
    public MilestoneResponse aiDecision(Long milestoneId, boolean approved, String feedback) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));

        if (approved) {
            milestone.setStatus(MilestoneStatus.AI_APPROVED);
            activateNextMilestone(milestone);
        } else {
            milestone.setStatus(MilestoneStatus.AI_REJECTED);
            milestone.setAiFeedback(feedback);
        }

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    @Transactional
    public ProjectResponse markFunded(Long projectId, User client) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Not authorized");
        }

        project.setStatus(ProjectStatus.FUNDED);

        if (!project.getMilestones().isEmpty()) {
            Milestone first = project.getMilestones().get(0);
            first.setStatus(MilestoneStatus.IN_PROGRESS);
            milestoneRepository.save(first);
        }

        return ProjectResponse.from(projectRepository.save(project));
    }

    private void activateNextMilestone(Milestone completed) {
        completed.setStatus(MilestoneStatus.COMPLETED);
        Project project = completed.getProject();

        List<Milestone> milestones = project.getMilestones();
        boolean allDone = milestones.stream().allMatch(m -> m.getStatus() == MilestoneStatus.COMPLETED
                || m.getStatus() == MilestoneStatus.CLIENT_APPROVED
                || m.getStatus() == MilestoneStatus.AI_APPROVED);

        if (allDone) {
            project.setStatus(ProjectStatus.COMPLETED);
            projectRepository.save(project);
        } else {
            milestones.stream()
                    .filter(m -> m.getStatus() == MilestoneStatus.PENDING)
                    .findFirst()
                    .ifPresent(next -> {
                        next.setStatus(MilestoneStatus.IN_PROGRESS);
                        milestoneRepository.save(next);
                    });
        }
    }

    private Project findAndAuthorize(Long id, User user) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        boolean isDeveloper = project.getDeveloper().getId().equals(user.getId());
        boolean isClient = project.getClient() != null && project.getClient().getId().equals(user.getId());
        if (!isDeveloper && !isClient) {
            throw new RuntimeException("Not authorized");
        }
        return project;
    }

    private List<String> saveFiles(List<MultipartFile> files) throws IOException {
        Path uploadDir = Paths.get("uploads");
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = uploadDir.resolve(filename);
            file.transferTo(filePath);
            urls.add("/uploads/" + filename);
        }
        return urls;
    }
}
