export enum NotificationType {
  PROJECT_INVITATION = 'PROJECT_INVITATION',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  APPLICATION_CREATED = 'APPLICATION_CREATED',
  APPLICATION_DELETED = 'APPLICATION_DELETED',
  NEW_RELEASE = 'NEW_RELEASE',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  is_actionable: boolean;
  read_at: string | null;
  created_at: string;
}
