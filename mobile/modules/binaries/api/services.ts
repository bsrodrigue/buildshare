import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  Application,
  ApplicationCreateParams,
  ApplicationSchema,
  Artifact,
  ArtifactSchema,
  ArtifactUploadParams,
} from './schemas';

export const binaryService = {
  /**
   * List all applications within a project
   */
  listApplications: async (projectId: number): Promise<Application[]> => {
    const response = await http.get<Application[]>(`binaries/applications/?project_id=${projectId}`);
    return response; // List responses are handled slightly differently in this boilerplate
  },

  /**
   * Create a new application entry
   */
  createApplication: async (params: ApplicationCreateParams): Promise<Application> => {
    const response = await http.post<Application>('binaries/applications/', params);
    return validateModel(ApplicationSchema, response, 'Application Create');
  },

  /**
   * Upload an artifact (binary)
   */
  uploadArtifact: async (params: ArtifactUploadParams): Promise<Artifact> => {
    const formData = new FormData();
    formData.append('application_id', params.application_id.toString());
    formData.append('version_code', params.version_code.toString());
    formData.append('version_id', params.version_id);
    
    if (params.release_notes) formData.append('release_notes', params.release_notes);
    if (params.architecture) formData.append('architecture', params.architecture);
    
    // File handling (expects an object with uri, type, name)
    formData.append('file', params.file);

    const response = await http.post<Artifact>('binaries/artifacts/upload/', formData);
    return validateModel(ArtifactSchema, response, 'Artifact Upload');
  },
};
