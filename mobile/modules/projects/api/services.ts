import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  Project,
  ProjectCreateParams,
  ProjectListResponse,
  ProjectListResponseSchema,
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
};
