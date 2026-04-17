import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from './services';
import { ProjectCreateParams } from './schemas';

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
