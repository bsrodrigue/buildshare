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
 * Project Member
 */
export const ProjectMemberSchema = z.object({
  user_id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  created_at: z.string(),
});

export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

/**
 * Project Create
 */
export const ProjectCreateParamsSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
});

export type ProjectCreateParams = z.infer<typeof ProjectCreateParamsSchema>;

/**
 * Project Update
 */
export const ProjectUpdateParamsSchema = ProjectCreateParamsSchema;
export type ProjectUpdateParams = ProjectCreateParams;

/**
 * Project List Response (Paginated)
 */
export const ProjectListResponseSchema = z.array(ProjectSchema);
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;
