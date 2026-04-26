import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';

import {
  Application,
  ApplicationCreateParams,
  ApplicationUpdateParams,
  BugMessage,
  BugMessageInput,
  BugReport,
  BugReportInput,
  Release,
  ReleaseTag,
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

/**
 * Hook to fetch bugs for a release.
 */
export const useBugs = (releaseId: number) => {
  return useQuery<BugReport[], AppError, BugReport[]>({
    queryKey: ['bugs', releaseId],
    queryFn: () => binaryService.listBugs(releaseId),
    enabled: !!releaseId,
  });
};

/**
 * Hook to create a new bug for a release.
 */
export const useCreateBug = () => {
  const queryClient = useQueryClient();

  return useMutation<BugReport, AppError, { releaseId: number; params: BugReportInput }>({
    mutationFn: ({ releaseId, params }) => binaryService.createBug(releaseId, params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['bugs', variables.releaseId],
      });
      toast.success('Bug rapporté !');
    },
  });
};

/**
 * Hook to fetch a single bug detail.
 */
export const useBug = (bugId: string) => {
  return useQuery<BugReport, AppError>({
    queryKey: ['bug', bugId],
    queryFn: () => binaryService.getBug(bugId),
    enabled: !!bugId,
  });
};

/**
 * Hook to update a bug.
 */
export const useUpdateBug = () => {
  const queryClient = useQueryClient();

  return useMutation<BugReport, AppError, { id: string; params: BugReportInput }>({
    mutationFn: ({ id, params }) => binaryService.updateBug(id, params),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bugs', data.release] });
      void queryClient.invalidateQueries({ queryKey: ['bug', data.id] });
      toast.success('Bug mis à jour !');
    },
  });
};

/**
 * Hook to trigger a bug transition.
 */
export const useBugTransition = () => {
  const queryClient = useQueryClient();

  return useMutation<BugReport, AppError, { bugId: string; transition: string }>({
    mutationFn: ({ bugId, transition }) => binaryService.transitionBug(bugId, transition),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bugs', data.release] });
      void queryClient.invalidateQueries({ queryKey: ['bug', data.id] });
      toast.success('Statut du bug mis à jour !');
    },
  });
};

/**
 * Hook to fetch messages for a bug.
 */
export const useBugMessages = (bugId: string) => {
  return useQuery<BugMessage[], AppError, BugMessage[]>({
    queryKey: ['bug-messages', bugId],
    queryFn: () => binaryService.listBugMessages(bugId),
    enabled: !!bugId,
  });
};

/**
 * Hook to create a new message for a bug.
 */
export const useCreateBugMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<BugMessage, AppError, { bugId: string; params: BugMessageInput }>({
    mutationFn: ({ bugId, params }) => binaryService.createBugMessage(bugId, params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['bug-messages', variables.bugId],
      });
      // Also invalidate the bug to update message count if needed (though we don't have it in the schema yet, oh wait we do)
      void queryClient.invalidateQueries({ queryKey: ['bug', variables.bugId] });
    },
  });
};

/**
 * Hook to fetch project release tags.
 */
export const useProjectTags = (projectId: number) => {
  return useQuery<ReleaseTag[], AppError>({
    queryKey: ['project-tags', projectId],
    queryFn: () => binaryService.listProjectTags(projectId),
    enabled: !!projectId,
  });
};

/**
 * Hook to create a new project tag.
 */
export const useCreateProjectTag = (projectId: number) => {
  const queryClient = useQueryClient();

  return useMutation<ReleaseTag, AppError, { name: string; color: string }>({
    mutationFn: (params) => binaryService.createProjectTag(projectId, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-tags', projectId] });
    },
  });
};

/**
 * Hook to update a release's tags.
 */
export const useUpdateReleaseTags = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Release,
    AppError,
    { releaseId: number; tagIds: number[]; applicationId: number; projectId: number },
    { previousReleases?: Release[] }
  >({
    mutationFn: ({ releaseId, tagIds }) => binaryService.updateReleaseTags(releaseId, tagIds),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['releases', variables.applicationId] });

      // Snapshot the previous value
      const previousReleases = queryClient.getQueryData<Release[]>([
        'releases',
        variables.applicationId,
      ]);

      // Optimistically update to the new value
      if (previousReleases) {
        const projectTags = queryClient.getQueryData<ReleaseTag[]>([
          'project-tags',
          variables.projectId,
        ]);

        queryClient.setQueryData<Release[]>(['releases', variables.applicationId], (old) => {
          return old?.map((r) => {
            if (r.id === variables.releaseId) {
              const newTags = projectTags?.filter((t) => variables.tagIds.includes(t.id)) || [];
              return { ...r, tags: newTags };
            }
            return r;
          });
        });
      }

      // Return a context object with the snapshotted value
      return { previousReleases };
    },
    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousReleases) {
        queryClient.setQueryData(['releases', variables.applicationId], context.previousReleases);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to keep server as source of truth
      void queryClient.invalidateQueries({ queryKey: ['releases', variables.applicationId] });
      void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
    },
  });
};
