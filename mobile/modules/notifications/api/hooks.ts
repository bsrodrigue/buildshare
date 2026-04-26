import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/libs/api/client';

import { Notification } from '../types';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const response = await http.get<Notification[]>('notifications/');
      return response;
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await http.post(`notifications/${id}/mark_as_read/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useBulkMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await http.post(`notifications/bulk_mark_as_read/`, { ids });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useInvitationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
      action,
    }: {
      invitationId: string;
      action: 'accept' | 'reject';
    }) => {
      await http.post(`projects/invitations/${invitationId}/${action}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      // Also invalidate projects as membership might have changed
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
export function useUnreadNotificationsCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.read_at).length || 0;
}
