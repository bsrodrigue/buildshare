import { APIService, http } from '@/libs/api/client';
import { TokenService } from '@/libs/api/token-service';
import { validateModel } from '@/libs/api/validation';
import { createLogger } from '@/libs/log';

import {
  Application,
  ApplicationCreateParams,
  ApplicationSchema,
  ApplicationUpdateParams,
  BugMessage,
  BugMessageInput,
  BugMessageSchema,
  BugReport,
  BugReportInput,
  BugReportSchema,
  ProcessAPKParams,
  Release,
  ReleaseTag,
  TaskJob,
  UploadIntentParams,
  UploadIntentResponse,
} from './schemas';

const logger = createLogger('BinaryService');

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

      logger.debug(`PUT ${url}`);
      logger.debug(`file: ${fileAsset.name || 'upload.apk'} (${contentType})`);

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
          logger.debug('SUCCESS PUT upload to R2');
          resolve();
        } else {
          logger.error(`FAILURE ${xhr.status} PUT ${url}: ${xhr.responseText}`);
          reject(new Error(`Failed to upload to storage: ${xhr.status} ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        logger.error(`Network error PUT ${url}`);
        reject(new Error('Network error during upload to R2'));
      };

      // React Native's XMLHttpRequest supports Blob/File/Uri-based objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      xhr.send(file as any);
    });
  },

  /**
   * Upload file directly to the backend (Step 2b — local storage fallback)
   */
  uploadDirect: async (
    jobId: string,
    file: unknown,
    onProgress?: (progress: number) => void,
  ): Promise<void> => {
    const baseUrl = APIService.getClient().getBaseUrl();
    const token = TokenService.getAccessToken();
    const fileAsset = file as { uri: string; type?: string; name?: string };
    const url = new URL(`binaries/upload/${jobId}/`, baseUrl).href;
    logger.debug(`POST ${url}`);
    logger.debug(`file: ${fileAsset.name || 'upload.apk'} (${fileAsset.type || 'unknown'})`);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', {
        uri: fileAsset.uri,
        type: fileAsset.type || 'application/vnd.android.package-archive',
        name: fileAsset.name || 'upload.apk',
      } as unknown as Blob);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress((event.loaded / event.total) * 100);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          logger.debug(`SUCCESS POST binaries/upload/${jobId}/`);
          resolve();
        } else {
          logger.error(`FAILURE ${xhr.status} POST ${url}: ${xhr.responseText}`);
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        logger.error(`Network error POST ${url}`);
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Dispatch APK analysis as a background task (Step 3)
   */
  analyzeAPK: async (jobId: string): Promise<TaskJob> => {
    const response = await http.post<TaskJob>(`binaries/analyze-apk/${jobId}/`);
    return response;
  },

  /**
   * Trigger APK processing on the server with optional resolution (Step 4)
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

  /**
   * List bugs for a specific release
   */
  listBugs: async (releaseId: number): Promise<BugReport[]> => {
    const response = await http.get<BugReport[]>(`binaries/releases/${releaseId}/bugs/`);
    return response;
  },

  /**
   * Create a new bug for a release
   */
  createBug: async (releaseId: number, params: BugReportInput): Promise<BugReport> => {
    const response = await http.post<BugReport>(`binaries/releases/${releaseId}/bugs/`, params);
    return validateModel(BugReportSchema, response, 'Bug Create');
  },

  /**
   * Get a single bug detail
   */
  getBug: async (bugId: string): Promise<BugReport> => {
    const response = await http.get<BugReport>(`binaries/bugs/${bugId}/`);
    return validateModel(BugReportSchema, response, 'Bug Get');
  },

  /**
   * Update a bug (title/description)
   */
  updateBug: async (bugId: string, params: BugReportInput): Promise<BugReport> => {
    const response = await http.patch<BugReport>(`binaries/bugs/${bugId}/`, params);
    return validateModel(BugReportSchema, response, 'Bug Update');
  },

  /**
   * Trigger a status transition for a bug
   */
  transitionBug: async (bugId: string, transition: string): Promise<BugReport> => {
    const response = await http.post<BugReport>(
      `binaries/bugs/${bugId}/transitions/${transition}/`,
      {},
    );
    return validateModel(BugReportSchema, response, `Bug Transition ${transition}`);
  },

  /**
   * List messages for a specific bug
   */
  listBugMessages: async (bugId: string): Promise<BugMessage[]> => {
    const response = await http.get<BugMessage[]>(`binaries/bugs/${bugId}/messages/`);
    return response;
  },

  /**
   * Create a new message for a bug
   */
  createBugMessage: async (bugId: string, params: BugMessageInput): Promise<BugMessage> => {
    const response = await http.post<BugMessage>(`binaries/bugs/${bugId}/messages/`, params);
    return validateModel(BugMessageSchema, response, 'Bug Message Create');
  },

  /**
   * List all tags for a project
   */
  listProjectTags: async (projectId: number): Promise<ReleaseTag[]> => {
    const response = await http.get<ReleaseTag[]>(`binaries/projects/${projectId}/tags/`);
    return response;
  },

  /**
   * Create a new tag for a project
   */
  createProjectTag: async (
    projectId: number,
    params: { name: string; color: string },
  ): Promise<ReleaseTag> => {
    const response = await http.post<ReleaseTag>(`binaries/projects/${projectId}/tags/`, params);
    return response;
  },

  /**
   * Delete a tag from a project
   */
  deleteProjectTag: async (tagId: number): Promise<void> => {
    await http.delete(`binaries/tags/${tagId}/`);
  },

  /**
   * Cancel a PENDING task job
   */
  cancelJob: async (jobId: string): Promise<void> => {
    await http.post(`binaries/jobs/${jobId}/cancel/`);
  },

  /**
   * Update tags for a specific release
   */
  updateReleaseTags: async (releaseId: number, tagIds: number[]): Promise<Release> => {
    const response = await http.patch<Release>(`binaries/releases/${releaseId}/`, {
      tag_ids: tagIds,
    });
    return response;
  },
};
