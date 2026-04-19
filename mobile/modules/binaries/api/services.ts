import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  Application,
  ApplicationCreateParams,
  ApplicationSchema,
  ProcessAPKParams,
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
   * Uses raw fetch to bypass global authentication headers.
   */
  uploadToR2: async (url: string, file: any): Promise<void> => {
    // Determine MIME type
    const contentType = file.type || 'application/vnd.android.package-archive';

    // We use raw fetch here to ensure no global 'Authorization' headers
    // from our HTTP client interfere with the R2 presigned URL.
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': contentType,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload to storage: ${response.status} ${errorText}`);
    }
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
  getTaskJobs: async (projectId?: number): Promise<any[]> => {
    const response = await http.get<any[]>('binaries/jobs/', {
      searchParams: { project_id: projectId },
    });
    return response;
  },
};
