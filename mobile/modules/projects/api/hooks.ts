import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/libs/api/types';

import { Project, ProjectCreateParams, ProjectUpdateParams } from './schemas';
import { projectService } from './services';

/**
 * Hook to list all projects.
 */
export const useProjects = () => {
  return useQuery<Project[], AppError, Project[]>({
    queryKey: ['projects'],
    queryFn: projectService.list,
  });
};

/**
 * Hook to get a single project.
 */
export const useProject = (id: number) => {
  return useQuery<Project, AppError>({
    queryKey: ['projects', id],
    queryFn: () => projectService.get(id),
    enabled: !!id,
  });
};

/**
 * Hook to get project members.
 */
export const useProjectMembers = (id: number) => {
  return useQuery({
    queryKey: ['projects', id, 'members'],
    queryFn: () => projectService.listMembers(id),
    enabled: !!id,
  });
};

/**
 * Hook to create a new project.
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation<Project, AppError, ProjectCreateParams>({
    mutationFn: (params: ProjectCreateParams) => projectService.create(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

/**
 * Hook to update an existing project.
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation<Project, AppError, { id: number; params: ProjectUpdateParams }>({
    mutationFn: ({ id, params }) => projectService.update(id, params),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
    },
  });
};

/**
 * Hook to delete a project.
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, number>({
    mutationFn: (id) => projectService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

/**
 * Hook to send an invitation.
 */
export const useSendInvitation = () => {
  return useMutation<void, AppError, { projectId: number; email: string; role?: string }>({
    mutationFn: ({ projectId, email, role }) =>
      projectService.sendInvitation(projectId, email, role),
  });
};

/**
 * Hook to revoke membership.
 */
export const useRevokeMembership = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, { projectId: number; userId: number }>({
    mutationFn: ({ projectId, userId }) => projectService.revokeMembership(projectId, userId),
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      // If the user revoked their own membership, they should be redirected,
      // but that's handled in the UI layer.
    },
  });
};
