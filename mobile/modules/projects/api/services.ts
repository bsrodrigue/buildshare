import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  Project,
  ProjectCreateParams,
  ProjectListResponse,
  ProjectListResponseSchema,
  ProjectSchema,
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
};
