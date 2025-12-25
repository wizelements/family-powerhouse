import Pusher from 'pusher';

if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
  console.warn('Pusher credentials not set, realtime features will be disabled');
}

export const pusherServer = process.env.PUSHER_APP_ID
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

export function getChannelName(familyId: string, channelId: string): string {
  return `private-family-${familyId}-channel-${channelId}`;
}

export function getFamilyPresenceChannel(familyId: string): string {
  return `presence-family-${familyId}`;
}

export function getUserNotificationChannel(userId: string): string {
  return `private-user-${userId}`;
}

export async function triggerChannelEvent(
  familyId: string,
  channelId: string,
  event: string,
  data: unknown
): Promise<void> {
  if (!pusherServer) return;
  
  await pusherServer.trigger(getChannelName(familyId, channelId), event, data);
}

export async function triggerFamilyEvent(
  familyId: string,
  event: string,
  data: unknown
): Promise<void> {
  if (!pusherServer) return;
  
  await pusherServer.trigger(getFamilyPresenceChannel(familyId), event, data);
}

export async function triggerUserNotification(
  userId: string,
  event: string,
  data: unknown
): Promise<void> {
  if (!pusherServer) return;
  
  await pusherServer.trigger(getUserNotificationChannel(userId), event, data);
}

export type ChatEvent = 
  | 'message:new'
  | 'message:edit'
  | 'message:delete'
  | 'typing:start'
  | 'typing:stop'
  | 'reaction:add'
  | 'reaction:remove';

export type FamilyEvent =
  | 'pool:updated'
  | 'contribution:new'
  | 'withdrawal:requested'
  | 'withdrawal:decided'
  | 'member:joined'
  | 'member:left'
  | 'trip:updated'
  | 'venture:updated';

export type NotificationEvent =
  | 'notification:new';
