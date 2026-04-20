import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';

import {
  Application,
  ApplicationCreateParams,
  ApplicationUpdateParams,
  Release,
  TaskJob,
} from './schemas';
import { binaryService } from './services';

/**
 * Hook to list all applications for a given project.
 */
export const useApplications = (projectId: number) => {
  return useQuery<Application[], AppError, Application[]>({
    queryKey: ['applications', projectId],
    queryFn: () => binaryService.listApplications(projectId),
    enabled: !!projectId,
  });
};

/**
 * Hook to create a new application entry.
 */
export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<Application, AppError, ApplicationCreateParams>({
    mutationFn: (params: ApplicationCreateParams) => binaryService.createApplication(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['applications', variables.project_id] });
    },
  });
};

/**
 * Hook to fetch a single application detail.
 */
export const useApplication = (applicationId: number) => {
  return useQuery<Application, AppError>({
    queryKey: ['application', applicationId],
    queryFn: () => binaryService.getApplication(applicationId),
    enabled: !!applicationId,
  });
};

/**
 * Hook to update an existing application.
 */
export const useUpdateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<Application, AppError, { id: number; params: ApplicationUpdateParams }>({
    mutationFn: ({ id, params }) => binaryService.updateApplication(id, params),
    onSuccess: (data) => {
      // Invalidate the list and the single app cache
      void queryClient.invalidateQueries({ queryKey: ['applications', data.project] });
      void queryClient.invalidateQueries({ queryKey: ['application', data.id] });

      toast.success('Application mise à jour !');
    },
  });
};

/**
 * Hook to delete an application.
 */
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, { id: number; projectId: number }>({
    mutationFn: ({ id }) => binaryService.deleteApplication(id),
    onSuccess: (_, variables) => {
      // Invalidate the applications list for the project
      void queryClient.invalidateQueries({ queryKey: ['applications', variables.projectId] });

      toast.success('Application supprimée !');
    },
  });
};

/**
 * Orchestrated pipeline hook for APK uploads using R2 and asynchronous processing.
 */
export const useAPKUploadPipeline = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AppError,
    {
      projectId: number;
      file: unknown;
      title?: string;
      description?: string;
      onProgress?: (progress: number) => void;
    }
  >({
    mutationFn: async ({ projectId, file, title, description, onProgress }) => {
      // Step 0: Generate a unique idempotency key for this attempt
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // Step 1: Request Intent (get signed URL and tracking job ID)
      const intent = await binaryService.getUploadIntent({
        project_id: projectId,
        idempotency_key: idempotencyKey,
      });

      // Step 2: Direct Binary PUT to Cloudflare R2
      await binaryService.uploadToR2(intent.upload_url, file, onProgress);

      // Step 3: Trigger backend processing task
      return await binaryService.processAPK({
        job_id: intent.job_id,
        title,
        description,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refresh the UI
      void queryClient.invalidateQueries({ queryKey: ['applications', variables.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['artifacts'] });

      toast.success('Upload réussi !', "L'APK est en cours de traitement par le serveur.");
    },
  });
};

/**
 * Hook to fetch and monitor task jobs.
 * Polls every 5 seconds if there are active tasks.
 */
export const useTaskJobs = (projectId?: number) => {
  return useQuery<TaskJob[], AppError, TaskJob[]>({
    queryKey: ['task-jobs', projectId],
    queryFn: () => binaryService.getTaskJobs(projectId),
    refetchInterval: (query) => {
      // Auto-refresh every 5s if any job is still PENDING or STARTED
      const hasActiveJobs = query.state.data?.some(
        (job) => job.status === 'PENDING' || job.status === 'STARTED',
      );
      return hasActiveJobs ? 5000 : false;
    },
  });
};

/**
 * Hook to fetch releases for an application.
 */
export const useReleases = (applicationId: number) => {
  return useQuery<Release[], AppError, Release[]>({
    queryKey: ['releases', applicationId],
    queryFn: () => binaryService.listReleases(applicationId),
    enabled: !!applicationId,
  });
};
