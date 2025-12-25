'use client';

import PusherClient from 'pusher-js';

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') return null;
  
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    console.warn('Pusher client credentials not set');
    return null;
  }

  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
    });
  }

  return pusherClient;
}

export function getChannelName(familyId: string, channelId: string): string {
  return `private-family-${familyId}-channel-${channelId}`;
}

export function getFamilyPresenceChannel(familyId: string): string {
  return `presence-family-${familyId}`;
}

export function getUserNotificationChannel(userId: string): string {
  return `private-user-${userId}`;
}
