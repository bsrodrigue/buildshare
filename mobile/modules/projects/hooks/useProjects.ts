import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../api/services';
import { ProjectCreateParams } from '../api/schemas';

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProjectCreateParams) => projectService.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
