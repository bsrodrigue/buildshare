import * as z from 'zod';

/**
 * Schema for Project Invitation Payload
 */
export const ProjectInvitationPayloadSchema = z.object({
  invitation_id: z.uuid(),
  project_title: z.string(),
});

export type ProjectInvitationPayload = z.infer<typeof ProjectInvitationPayloadSchema>;

/**
 * Generic System Alert Payload (placeholder)
 */
export const SystemAlertPayloadSchema = z.record(z.string(), z.any());
