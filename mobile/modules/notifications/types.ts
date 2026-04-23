export enum NotificationType {
  PROJECT_INVITATION = 'PROJECT_INVITATION',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
