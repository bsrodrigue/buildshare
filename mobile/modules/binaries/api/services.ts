import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  Application,
  ApplicationCreateParams,
  ApplicationSchema,
  ApplicationUpdateParams,
  ProcessAPKParams,
  Release,
  TaskJob,
  UploadIntentParams,
  UploadIntentResponse,
} from './schemas';

export const binaryService = {
  /**
   * List all applications within a project
   */
  listApplications: async (projectId: number): Promise<Application[]> => {
    const response = await http.get<Application[]>(
      `binaries/applications/?project_id=${projectId}`,
    );
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
   * Request an upload intent (Step 1 of the new pipeline)
   */
  getUploadIntent: async (params: UploadIntentParams): Promise<UploadIntentResponse> => {
    const response = await http.post<UploadIntentResponse>('binaries/upload-intent/', params);
    return response;
  },

  /**
   * Directly upload file to Cloudflare R2 (Step 2 of the new pipeline)
   * Uses XMLHttpRequest to allow progress tracking.
   */
  uploadToR2: async (
    url: string,
    file: unknown,
    onProgress?: (progress: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const fileAsset = file as { uri: string; type?: string; name?: string };
      const contentType = fileAsset.type || 'application/vnd.android.package-archive';

      const xhr = new XMLHttpRequest();

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', contentType);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to upload to storage: ${xhr.status} ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload to R2'));

      // React Native's XMLHttpRequest supports Blob/File/Uri-based objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      xhr.send(file as any);
    });
  },

  /**
   * Trigger APK processing on the server (Step 3 of the new pipeline)
   */
  processAPK: async (params: ProcessAPKParams): Promise<{ message: string }> => {
    const response = await http.post<{ message: string }>('binaries/process-apk/', params);
    return response;
  },

  /**
   * Fetch all processing jobs for the user
   */
  getTaskJobs: async (projectId?: number): Promise<TaskJob[]> => {
    const response = await http.get<TaskJob[]>('binaries/jobs/', {
      searchParams: { project_id: projectId },
    });
    return response;
  },

  /**
   * Fetch all releases for a specific application
   */
  listReleases: async (applicationId: number): Promise<Release[]> => {
    const response = await http.get<Release[]>('binaries/releases/', {
      searchParams: { application_id: applicationId },
    });
    return response;
  },

  /**
   * Get a single application detail
   */
  getApplication: async (id: number): Promise<Application> => {
    const response = await http.get<Application>(`binaries/applications/${id}/`);
    return validateModel(ApplicationSchema, response, 'Application Get');
  },

  /**
   * Update an application
   */
  updateApplication: async (id: number, params: ApplicationUpdateParams): Promise<Application> => {
    const response = await http.put<Application>(`binaries/applications/${id}/`, params);
    return validateModel(ApplicationSchema, response, 'Application Update');
  },

  /**
   * Delete an application
   */
  deleteApplication: async (id: number): Promise<void> => {
    await http.delete(`binaries/applications/${id}/`);
  },
};
