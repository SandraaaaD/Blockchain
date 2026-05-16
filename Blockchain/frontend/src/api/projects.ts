import api from './axios';
import type { Project, Milestone, Message } from '../types';

export const createProjectApi = (data: {
  title: string;
  description: string;
  budget: number;
  deadlineDays: number;
  clientEmail: string;
}) => api.post<Project>('/api/projects', data).then((r) => r.data);

export const getMyProjectsApi = () =>
  api.get<Project[]>('/api/projects').then((r) => r.data);

export const getProjectApi = (id: number) =>
  api.get<Project>(`/api/projects/${id}`).then((r) => r.data);

export const respondToProjectApi = (id: number, accept: boolean) =>
  api.post<Project>(`/api/projects/${id}/respond?accept=${accept}`).then((r) => r.data);

export const updateRequirementsApi = (id: number, requirements: string[]) =>
  api.put<Project>(`/api/projects/${id}/requirements`, requirements).then((r) => r.data);

export const addMilestoneApi = (
  projectId: number,
  data: { title: string; description: string; amount: number; acceptanceCriteria: string[] }
) => api.post<Milestone>(`/api/projects/${projectId}/milestones`, data).then((r) => r.data);

export const submitMilestoneApi = (
  milestoneId: number,
  data: { githubRepo?: string; demoLink?: string; notes?: string },
  files?: File[]
) => {
  const formData = new FormData();
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  if (files) {
    files.forEach((f) => formData.append('files', f));
  }
  return api.post<Milestone>(`/api/projects/milestones/${milestoneId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const reviewMilestoneApi = (
  milestoneId: number,
  approved: boolean,
  feedback?: string
) => {
  const params = new URLSearchParams({ approved: String(approved) });
  if (feedback) params.append('feedback', feedback);
  return api.post<Milestone>(`/api/projects/milestones/${milestoneId}/review?${params}`).then((r) => r.data);
};

export const markFundedApi = (projectId: number) =>
  api.post<Project>(`/api/projects/${projectId}/fund`).then((r) => r.data);

export const addReviewApi = (
  projectId: number,
  data: { rating: number; comment: string }
) => api.post(`/api/projects/${projectId}/reviews`, data).then((r) => r.data);

export const getMessagesApi = (projectId: number) =>
  api.get<Message[]>(`/api/projects/${projectId}/messages`).then((r) => r.data);

export const sendMessageApi = (projectId: number, content: string, file?: File) => {
  const formData = new FormData();
  formData.append('content', content);
  if (file) formData.append('file', file);
  return api.post<Message>(`/api/projects/${projectId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
