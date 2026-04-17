import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { binaryService } from '../api/services';
import { ApplicationCreateParams } from '../api/schemas';

export const useApplications = (projectId: number) => {
  return useQuery({
    queryKey: ['applications', projectId],
    queryFn: () => binaryService.listApplications(projectId),
    enabled: !!projectId,
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ApplicationCreateParams) => 
      binaryService.createApplication(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications', variables.project] });
    },
  });
};
