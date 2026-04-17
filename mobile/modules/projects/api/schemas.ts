import { z } from 'zod';

/**
 * Project Model
 */
export const ProjectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  created_at: z.string(),
  role: z.string().nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project Create
 */
export const ProjectCreateParamsSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
});

export type ProjectCreateParams = z.infer<typeof ProjectCreateParamsSchema>;

/**
 * Project List Response (Paginated)
 */
export const ProjectListResponseSchema = z.array(ProjectSchema);
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;
