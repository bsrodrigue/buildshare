import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { binaryService } from './services';
import { ApplicationCreateParams } from './schemas';

/**
 * Hook to list all applications for a given project.
 */
export const useApplications = (projectId: number) => {
  return useQuery({
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

  return useMutation({
    mutationFn: (params: ApplicationCreateParams) =>
      binaryService.createApplication(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications', variables.project_id] });
    },
  });
};

/**
 * Orchestrated pipeline hook for APK uploads using R2 and asynchronous processing.
 */
export const useAPKUploadPipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      title,
      description,
    }: {
      projectId: number;
      file: any;
      title?: string;
      description?: string;
    }) => {
      // Step 1: Request Intent (get signed URL and tracking job ID)
      const intent = await binaryService.getUploadIntent({ project_id: projectId });

      // Step 2: Direct Binary PUT to Cloudflare R2
      await binaryService.uploadToR2(intent.upload_url, file);

      // Step 3: Trigger backend processing task
      return await binaryService.processAPK({
        job_id: intent.job_id,
        title,
        description,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['applications', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      
      Toast.show({
        type: 'success',
        text1: 'Upload réussi !',
        text2: 'L\'APK est en cours de traitement par le serveur.',
      });
    },
  });
};

/**
 * Hook to fetch and monitor task jobs.
 * Polls every 5 seconds if there are active tasks.
 */
export const useTaskJobs = (projectId?: number) => {
  return useQuery({
    queryKey: ['task-jobs', projectId],
    queryFn: () => binaryService.getTaskJobs(projectId),
    refetchInterval: (query) => {
      // Auto-refresh every 5s if any job is still PENDING or STARTED
      const hasActiveJobs = query.state.data?.some(
        (job) => job.status === 'PENDING' || job.status === 'STARTED'
      );
      return hasActiveJobs ? 5000 : false;
    },
  });
};
