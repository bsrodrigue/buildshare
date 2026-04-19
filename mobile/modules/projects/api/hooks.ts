import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ProjectCreateParams } from './schemas';
import { projectService } from './services';

/**
 * Hook to list all projects.
 */
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
  });
};

/**
 * Hook to create a new project.
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProjectCreateParams) => projectService.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
