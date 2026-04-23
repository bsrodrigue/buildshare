import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  Project,
  ProjectCreateParams,
  ProjectListResponse,
  ProjectListResponseSchema,
  ProjectMember,
  ProjectSchema,
  ProjectUpdateParams,
} from './schemas';

export const projectService = {
  /**
   * List all projects where the user is a member
   */
  list: async (): Promise<ProjectListResponse> => {
    const response = await http.get<ProjectListResponse>('projects/');
    return validateModel(ProjectListResponseSchema, response, 'Project List');
  },

  /**
   * Create a new project
   */
  create: async (params: ProjectCreateParams): Promise<Project> => {
    const response = await http.post<Project>('projects/', params);
    return validateModel(ProjectSchema, response, 'Project Create');
  },

  /**
   * Get a single project
   */
  get: async (id: number): Promise<Project> => {
    const response = await http.get<Project>(`projects/${id}/`);
    return validateModel(ProjectSchema, response, 'Project Get');
  },

  /**
   * List project members
   */
  listMembers: async (id: number): Promise<ProjectMember[]> => {
    return await http.get<ProjectMember[]>(`projects/${id}/members/`);
  },

  /**
   * Update a project
   */
  update: async (id: number, params: ProjectUpdateParams): Promise<Project> => {
    const response = await http.put<Project>(`projects/${id}/`, params);
    return validateModel(ProjectSchema, response, 'Project Update');
  },

  /**
   * Delete a project
   */
  delete: async (id: number): Promise<void> => {
    await http.delete(`projects/${id}/`);
  },

  /**
   * Send an invitation to a project
   */
  sendInvitation: async (
    projectId: number,
    email: string,
    role: string = 'MEMBER',
  ): Promise<void> => {
    await http.post(`projects/${projectId}/invitations/`, { email, role });
  },

  /**
   * Revoke a user membership from a project
   */
  revokeMembership: async (projectId: number, userId: number): Promise<void> => {
    await http.delete(`projects/${projectId}/members/${userId}/`);
  },
};
