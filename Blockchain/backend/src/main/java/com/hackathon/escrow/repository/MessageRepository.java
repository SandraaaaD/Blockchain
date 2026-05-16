package com.hackathon.escrow.repository;

import com.hackathon.escrow.model.Message;
import com.hackathon.escrow.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByProjectOrderByCreatedAtAsc(Project project);
}
