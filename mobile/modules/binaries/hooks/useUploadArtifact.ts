import { useMutation, useQueryClient } from '@tanstack/react-query';
import { binaryService } from '../api/services';
import { ArtifactUploadParams } from '../api/schemas';

export const useUploadArtifact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ArtifactUploadParams) => 
      binaryService.uploadArtifact(params),
    onSuccess: (_, variables) => {
      // Invalidate both applications and specific app details if needed
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['releases', variables.application_id] });
    },
  });
};
