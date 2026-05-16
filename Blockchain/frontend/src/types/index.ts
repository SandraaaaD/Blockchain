export type UserRole = 'CLIENT' | 'DEVELOPER';

export type ProjectStatus =
  | 'PENDING_CLIENT'
  | 'ACTIVE'
  | 'FUNDED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export type MilestoneStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'CLIENT_APPROVED'
  | 'AI_REVIEW'
  | 'AI_APPROVED'
  | 'AI_REJECTED'
  | 'COMPLETED';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AcceptanceCriteria {
  id: number;
  description: string;
}

export interface Submission {
  id: number;
  githubRepo?: string;
  demoLink?: string;
  notes?: string;
  fileUrls: string[];
  submittedAt: string;
}

export interface Milestone {
  id: number;
  title: string;
  description?: string;
  amount: number;
  orderIndex: number;
  status: MilestoneStatus;
  acceptanceCriteria: string[];
  submission?: Submission;
  aiFeedback?: string;
  createdAt: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  budget: number;
  deadlineDays?: number;
  status: ProjectStatus;
  developer: User;
  client?: User;
  clientEmail: string;
  milestones: Milestone[];
  requirements: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  projectId: number;
  sender: User;
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

/** In-app notifications (invite, milestones, chat, escrow, reviews, completion). */
export interface AppNotification {
  id: number;
  category: string;
  title: string;
  body: string;
  projectId?: number | null;
  read: boolean;
  createdAt: string;
}
