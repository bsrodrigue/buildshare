import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/libs/api/types';

import { Project, ProjectCreateParams } from './schemas';
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
