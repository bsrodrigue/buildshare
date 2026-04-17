import { z } from 'zod';

/**
 * Application Model
 */
export const ApplicationSchema = z.object({
  id: z.number(),
  project: z.number(),
  app_id: z.string(),
  title: z.string(),
  description: z.string(),
  created_at: z.string(),
});

export type Application = z.infer<typeof ApplicationSchema>;

/**
 * Release Model
 */
export const ReleaseSchema = z.object({
  id: z.number(),
  application: z.number(),
  version_code: z.number(),
  version_id: z.string(),
  release_notes: z.string(),
  created_at: z.string(),
});

export type Release = z.infer<typeof ReleaseSchema>;

/**
 * Artifact Model
 */
export const ArtifactSchema = z.object({
  id: z.number(),
  release: z.number(),
  file: z.string(),
  architecture: z.string(),
  hash: z.string(),
  created_at: z.string(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * Application Create
 */
export const ApplicationCreateParamsSchema = z.object({
  project_id: z.number(),
  app_id: z.string().min(1, 'ID de bundle requis (ex: com.app.id)'),
  title: z.string().min(1, "Titre de l'application requis"),
  description: z.string().optional(),
});

export type ApplicationCreateParams = z.infer<typeof ApplicationCreateParamsSchema>;

/**
 * Artifact Upload (includes Release info)
 */
export const ArtifactUploadParamsSchema = z.object({
  application_id: z.number(),
  version_code: z.number(),
  version_id: z.string().min(1, 'Version requise (ex: 1.0.0)'),
  release_notes: z.string().optional(),
  architecture: z.string().optional(),
  file: z.any(), // File object
});

export type ArtifactUploadParams = z.infer<typeof ArtifactUploadParamsSchema>;
