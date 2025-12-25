'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { createChannelSchema, sendMessageSchema, reactionSchema } from '@/lib/validation/schemas';
import { hasPermission } from '@/lib/auth/rbac';
import { triggerChannelEvent } from '@/lib/pusher/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { Channel, Message } from '@prisma/client';

export async function createChannelAction(formData: FormData): Promise<ActionResult<{ channelId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CREATE_CHANNEL')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name'),
    type: formData.get('type') || 'PUBLIC',
    description: formData.get('description'),
  };

  const result = createChannelSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const existingChannel = await prisma.channel.findFirst({
    where: {
      familyId: session.user.familyId,
      name: result.data.name,
    },
  });

  if (existingChannel) {
    return { success: false, error: 'Channel name already exists' };
  }

  const channel = await prisma.channel.create({
    data: {
      familyId: session.user.familyId,
      name: result.data.name,
      type: result.data.type,
      description: result.data.description,
    },
  });

  revalidatePath('/dashboard/chat');
  return { success: true, data: { channelId: channel.id } };
}

export async function sendMessageAction(formData: FormData): Promise<ActionResult<{ messageId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'SEND_MESSAGE')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    channelId: formData.get('channelId'),
    content: formData.get('content'),
    parentId: formData.get('parentId') || undefined,
  };

  const result = sendMessageSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: result.data.channelId,
      familyId: session.user.familyId,
    },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  // Extract mentions
  const mentionMatches = result.data.content.match(/@(\w+)/g);
  const mentionedUsernames = mentionMatches?.map((m) => m.slice(1)) || [];

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.message.create({
      data: {
        channelId: result.data.channelId,
        senderId: session.user.id,
        content: result.data.content,
        parentId: result.data.parentId,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Create mentions if any
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await tx.user.findMany({
        where: {
          name: { in: mentionedUsernames },
          memberships: {
            some: { familyId: session.user.familyId! },
          },
        },
        select: { id: true },
      });

      if (mentionedUsers.length > 0) {
        await tx.mention.createMany({
          data: mentionedUsers.map((u) => ({
            messageId: newMessage.id,
            userId: u.id,
          })),
        });

        // Create notifications for mentioned users
        await tx.notification.createMany({
          data: mentionedUsers.map((u) => ({
            userId: u.id,
            familyId: session.user.familyId!,
            type: 'MENTION' as const,
            title: 'You were mentioned',
            message: `${session.user.name || 'Someone'} mentioned you in #${channel.name}`,
            data: { messageId: newMessage.id, channelId: channel.id },
          })),
        });
      }
    }

    return newMessage;
  });

  // Broadcast message in real-time
  await triggerChannelEvent(session.user.familyId, channel.id, 'message:new', {
    id: message.id,
    channelId: message.channelId,
    content: message.content,
    sender: message.sender,
    createdAt: message.createdAt,
    parentId: message.parentId,
  });

  return { success: true, data: { messageId: message.id } };
}

export async function addReactionAction(formData: FormData): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const rawData = {
    messageId: formData.get('messageId'),
    emoji: formData.get('emoji'),
  };

  const result = reactionSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const message = await prisma.message.findFirst({
    where: { id: result.data.messageId },
    include: { channel: true },
  });

  if (!message || message.channel.familyId !== session.user.familyId) {
    return { success: false, error: 'Message not found' };
  }

  await prisma.reaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId: result.data.messageId,
        userId: session.user.id,
        emoji: result.data.emoji,
      },
    },
    create: {
      messageId: result.data.messageId,
      userId: session.user.id,
      emoji: result.data.emoji,
    },
    update: {},
  });

  await triggerChannelEvent(session.user.familyId, message.channelId, 'reaction:add', {
    messageId: message.id,
    userId: session.user.id,
    emoji: result.data.emoji,
  });

  return { success: true, data: undefined };
}

export async function removeReactionAction(messageId: string, emoji: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { channel: true },
  });

  if (!message || message.channel.familyId !== session.user.familyId) {
    return { success: false, error: 'Message not found' };
  }

  await prisma.reaction.delete({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: session.user.id,
        emoji,
      },
    },
  });

  await triggerChannelEvent(session.user.familyId, message.channelId, 'reaction:remove', {
    messageId,
    userId: session.user.id,
    emoji,
  });

  return { success: true, data: undefined };
}

export async function deleteMessageAction(messageId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { channel: true },
  });

  if (!message || message.channel.familyId !== session.user.familyId) {
    return { success: false, error: 'Message not found' };
  }

  // Can only delete own messages unless moderator
  if (message.senderId !== session.user.id && !hasPermission(session.user.role, 'DELETE_ANY_MESSAGE')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: '[Message deleted]' },
  });

  await triggerChannelEvent(session.user.familyId, message.channelId, 'message:delete', {
    messageId,
  });

  return { success: true, data: undefined };
}

export async function getChannels(): Promise<Channel[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.channel.findMany({
    where: { familyId: session.user.familyId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function getChannelMessages(
  channelId: string,
  cursor?: string,
  limit: number = 50
): Promise<{ messages: Message[]; nextCursor?: string }> {
  const session = await auth();
  if (!session?.user?.familyId) return { messages: [] };

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, familyId: session.user.familyId },
  });

  if (!channel) return { messages: [] };

  const messages = await prisma.message.findMany({
    where: { channelId },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      reactions: true,
      mentions: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  let nextCursor: string | undefined;
  if (messages.length > limit) {
    const nextItem = messages.pop();
    nextCursor = nextItem?.id;
  }

  return { messages: messages.reverse(), nextCursor };
}
