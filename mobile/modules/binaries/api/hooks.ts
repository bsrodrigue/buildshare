import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { binaryService } from './services';
import { ApplicationCreateParams, ArtifactUploadParams } from './schemas';

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
 * Hook to upload a new artifact (binary) for an application.
 */
export const useUploadArtifact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ArtifactUploadParams) =>
      binaryService.uploadArtifact(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['artifacts', variables.application_id],
      });
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'L\'artéfact a été téléversé avec succès.',
      });
    },
  });
};
