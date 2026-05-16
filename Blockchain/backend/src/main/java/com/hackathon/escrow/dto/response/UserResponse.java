package com.hackathon.escrow.dto.response;

import com.hackathon.escrow.model.User;
import com.hackathon.escrow.model.enums.UserRole;
import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private UserRole role;
    private String avatarUrl;

    public static UserResponse from(User user) {
        UserResponse r = new UserResponse();
        r.setId(user.getId());
        r.setEmail(user.getEmail());
        r.setFullName(user.getFullName());
        r.setRole(user.getRole());
        r.setAvatarUrl(user.getAvatarUrl());
        return r;
    }
}
