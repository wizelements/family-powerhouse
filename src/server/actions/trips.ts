'use server';

import { prisma, AuditEvent } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { TripStatus, ItineraryType, TripBudgetCategory, TravelerStatus, Trip, TripDay, ItineraryItem } from '@prisma/client';
import { z } from 'zod';
import { triggerFamilyEvent, triggerUserNotification } from '@/lib/pusher/server';

const createTripSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  destination: z.string().min(1, 'Destination is required').max(200),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive().optional(),
});

const updateTripSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  destination: z.string().min(1).max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['PLANNING', 'BOOKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

const createItineraryItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['FLIGHT', 'TRANSPORT', 'LODGING', 'ACTIVITY', 'MEAL', 'OTHER']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  cost: z.number().optional(),
  bookingRef: z.string().max(100).optional(),
});

// ============================================================================
// TRIP CRUD
// ============================================================================

export async function createTripAction(formData: FormData): Promise<ActionResult<{ tripId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CREATE_TRIP')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    destination: formData.get('destination'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : undefined,
  };

  const result = createTripSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const trip = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          familyId: session.user.familyId!,
          createdById: session.user.id,
          name: result.data.name,
          description: result.data.description,
          destination: result.data.destination,
          startDate: new Date(result.data.startDate),
          endDate: new Date(result.data.endDate),
          status: 'PLANNING',
        },
      });

      // Add creator as traveler
      await tx.tripTraveler.create({
        data: {
          tripId: newTrip.id,
          userId: session.user.id,
          status: 'CONFIRMED',
        },
      });

      // Create default budget items
      if (result.data.budget) {
        const budgetDistribution: Record<TripBudgetCategory, number> = {
          LODGING: 0.35,
          TRAVEL: 0.25,
          FOOD: 0.20,
          ACTIVITIES: 0.15,
          BUFFER: 0.05,
          OTHER: 0,
        };

        await tx.tripBudgetItem.createMany({
          data: Object.entries(budgetDistribution)
            .filter(([, ratio]) => ratio > 0)
            .map(([category, ratio]) => ({
              tripId: newTrip.id,
              category: category as TripBudgetCategory,
              planned: Math.round(result.data.budget! * ratio),
              actual: 0,
            })),
        });
      }

      // Create trip days
      const start = new Date(result.data.startDate);
      const end = new Date(result.data.endDate);
      const days = [];
      const current = new Date(start);
      
      while (current <= end) {
        days.push({ tripId: newTrip.id, date: new Date(current) });
        current.setDate(current.getDate() + 1);
      }

      if (days.length > 0) {
        await tx.tripDay.createMany({ data: days });
      }

      return newTrip;
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.TRIP_CREATED,
      targetType: 'Trip',
      targetId: trip.id,
      metadata: { name: result.data.name, destination: result.data.destination },
    });

    // Broadcast real-time update
    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'created',
      tripId: trip.id,
      tripName: trip.name,
      destination: trip.destination,
      createdBy: session.user.id,
    });

    revalidatePath('/dashboard/trips');
    return { success: true, data: { tripId: trip.id } };
  } catch (error) {
    console.error('[createTripAction] Error:', error);
    return { success: false, error: 'Failed to create trip' };
  }
}

export async function updateTripAction(
  tripId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    include: { travelers: true },
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  const isTraveler = trip.travelers.some(t => t.userId === session.user.id);
  if (!isTraveler && !hasPermission(session.user.role, 'EDIT_TRIP')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    destination: formData.get('destination') || undefined,
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
    status: formData.get('status') || undefined,
  };

  const result = updateTripSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.destination && { destination: result.data.destination }),
        ...(result.data.startDate && { startDate: new Date(result.data.startDate) }),
        ...(result.data.endDate && { endDate: new Date(result.data.endDate) }),
        ...(result.data.status && { status: result.data.status as TripStatus }),
      },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.TRIP_UPDATED,
      targetType: 'Trip',
      targetId: tripId,
      metadata: result.data,
    });

    // Broadcast real-time update to all family members
    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'updated',
      tripId: trip.id,
      tripName: updatedTrip.name,
      changes: result.data,
      updatedBy: session.user.id,
    });

    // Notify all travelers
    for (const traveler of trip.travelers) {
      if (traveler.userId !== session.user.id) {
        await triggerUserNotification(traveler.userId, 'notification:new', {
          type: 'TRIP_UPDATE',
          title: `Trip Updated: ${updatedTrip.name}`,
          message: `${session.user.name || 'A family member'} updated the trip details`,
          tripId: trip.id,
        });
      }
    }

    revalidatePath(`/dashboard/trips/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateTripAction] Error:', error);
    return { success: false, error: 'Failed to update trip' };
  }
}

export async function updateTripStatusAction(
  tripId: string,
  status: TripStatus
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    include: { travelers: true },
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  if (!hasPermission(session.user.role, 'EDIT_TRIP')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { status },
    });

    // Broadcast status change
    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'status_changed',
      tripId: trip.id,
      tripName: trip.name,
      previousStatus: trip.status,
      newStatus: status,
      updatedBy: session.user.id,
    });

    // Notify travelers of status change
    const statusMessages: Record<TripStatus, string> = {
      PLANNING: 'is now in planning phase',
      BOOKED: 'has been booked! 🎉',
      IN_PROGRESS: 'has started! Have a great trip! ✈️',
      COMPLETED: 'is complete. Hope you had fun! 🌟',
      CANCELLED: 'has been cancelled',
    };

    for (const traveler of trip.travelers) {
      if (traveler.userId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: traveler.userId,
            familyId: session.user.familyId,
            type: 'TRIP_UPDATE',
            title: `Trip Status: ${trip.name}`,
            message: `Your trip to ${trip.destination} ${statusMessages[status]}`,
            data: { tripId: trip.id, status },
          },
        });

        await triggerUserNotification(traveler.userId, 'notification:new', {
          type: 'TRIP_UPDATE',
          title: `Trip Status: ${trip.name}`,
          message: statusMessages[status],
        });
      }
    }

    revalidatePath(`/dashboard/trips/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateTripStatusAction] Error:', error);
    return { success: false, error: 'Failed to update trip status' };
  }
}

export async function deleteTripAction(tripId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'DELETE_TRIP')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  try {
    await prisma.trip.delete({
      where: { id: tripId },
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'deleted',
      tripId,
      tripName: trip.name,
      deletedBy: session.user.id,
    });

    revalidatePath('/dashboard/trips');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteTripAction] Error:', error);
    return { success: false, error: 'Failed to delete trip' };
  }
}

export async function getTrips(): Promise<(Trip & { _count: { travelers: number; days: number } })[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.trip.findMany({
    where: { familyId: session.user.familyId },
    include: { _count: { select: { travelers: true, days: true } } },
    orderBy: { startDate: 'desc' },
  });
}

export async function getTrip(tripId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    include: {
      travelers: { include: { trip: false } },
      days: {
        orderBy: { date: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
      tasks: { orderBy: { dueDate: 'asc' } },
      budgetItems: true,
      pool: true,
      votes: true,
      attachments: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ============================================================================
// TRAVELERS
// ============================================================================

export async function inviteTravelerAction(
  tripId: string,
  userId: string
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  // Check if user is in family
  const membership = await prisma.membership.findFirst({
    where: { userId, familyId: session.user.familyId, status: 'ACTIVE' },
  });

  if (!membership) {
    return { success: false, error: 'User is not a family member' };
  }

  try {
    await prisma.tripTraveler.upsert({
      where: { tripId_userId: { tripId, userId } },
      update: { status: 'INVITED' },
      create: { tripId, userId, status: 'INVITED' },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        familyId: session.user.familyId,
        type: 'TRIP_INVITE',
        title: `Trip Invitation: ${trip.name}`,
        message: `You've been invited to join a trip to ${trip.destination}!`,
        data: { tripId: trip.id },
      },
    });

    await triggerUserNotification(userId, 'notification:new', {
      type: 'TRIP_INVITE',
      title: `Trip Invitation: ${trip.name}`,
      message: `You've been invited to join a trip to ${trip.destination}!`,
      tripId: trip.id,
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'traveler_invited',
      tripId: trip.id,
      tripName: trip.name,
      invitedUserId: userId,
      invitedBy: session.user.id,
    });

    revalidatePath(`/dashboard/trips/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[inviteTravelerAction] Error:', error);
    return { success: false, error: 'Failed to invite traveler' };
  }
}

export async function respondToTripInviteAction(
  tripId: string,
  response: 'CONFIRMED' | 'DECLINED' | 'MAYBE'
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const traveler = await prisma.tripTraveler.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
    include: { trip: true },
  });

  if (!traveler) {
    return { success: false, error: 'Invitation not found' };
  }

  try {
    await prisma.tripTraveler.update({
      where: { tripId_userId: { tripId, userId: session.user.id } },
      data: { status: response as TravelerStatus },
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'traveler_responded',
      tripId,
      tripName: traveler.trip.name,
      userId: session.user.id,
      response,
    });

    revalidatePath(`/dashboard/trips/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[respondToTripInviteAction] Error:', error);
    return { success: false, error: 'Failed to respond to invitation' };
  }
}

// ============================================================================
// ITINERARY
// ============================================================================

export async function addItineraryItemAction(
  tripDayId: string,
  formData: FormData
): Promise<ActionResult<{ itemId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const tripDay = await prisma.tripDay.findUnique({
    where: { id: tripDayId },
    include: { trip: { include: { travelers: true } } },
  });

  if (!tripDay || tripDay.trip.familyId !== session.user.familyId) {
    return { success: false, error: 'Trip day not found' };
  }

  const isTraveler = tripDay.trip.travelers.some(t => t.userId === session.user.id);
  if (!isTraveler && !hasPermission(session.user.role, 'EDIT_TRIP')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    title: formData.get('title'),
    type: formData.get('type'),
    startTime: formData.get('startTime') || undefined,
    endTime: formData.get('endTime') || undefined,
    location: formData.get('location') || undefined,
    description: formData.get('description') || undefined,
    cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : undefined,
    bookingRef: formData.get('bookingRef') || undefined,
  };

  const result = createItineraryItemSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    // Get max order for this day
    const maxOrder = await prisma.itineraryItem.aggregate({
      where: { tripDayId },
      _max: { order: true },
    });

    const item = await prisma.itineraryItem.create({
      data: {
        tripDayId,
        title: result.data.title,
        type: result.data.type as ItineraryType,
        startTime: result.data.startTime ? new Date(result.data.startTime) : undefined,
        endTime: result.data.endTime ? new Date(result.data.endTime) : undefined,
        location: result.data.location,
        description: result.data.description,
        cost: result.data.cost,
        bookingRef: result.data.bookingRef,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    // Broadcast real-time update
    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'itinerary_updated',
      tripId: tripDay.tripId,
      tripName: tripDay.trip.name,
      dayId: tripDayId,
      itemId: item.id,
      updatedBy: session.user.id,
    });

    revalidatePath(`/dashboard/trips/${tripDay.tripId}`);
    return { success: true, data: { itemId: item.id } };
  } catch (error) {
    console.error('[addItineraryItemAction] Error:', error);
    return { success: false, error: 'Failed to add itinerary item' };
  }
}

export async function updateItineraryItemAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const item = await prisma.itineraryItem.findUnique({
    where: { id: itemId },
    include: { tripDay: { include: { trip: true } } },
  });

  if (!item || item.tripDay.trip.familyId !== session.user.familyId) {
    return { success: false, error: 'Item not found' };
  }

  try {
    await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        title: (formData.get('title') as string) || item.title,
        type: (formData.get('type') as ItineraryType) || item.type,
        startTime: formData.get('startTime') ? new Date(formData.get('startTime') as string) : item.startTime,
        endTime: formData.get('endTime') ? new Date(formData.get('endTime') as string) : item.endTime,
        location: (formData.get('location') as string) || item.location,
        description: (formData.get('description') as string) || item.description,
        cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : item.cost,
        bookingRef: (formData.get('bookingRef') as string) || item.bookingRef,
        isBooked: formData.get('isBooked') === 'true',
      },
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'itinerary_updated',
      tripId: item.tripDay.tripId,
      tripName: item.tripDay.trip.name,
      itemId,
      updatedBy: session.user.id,
    });

    revalidatePath(`/dashboard/trips/${item.tripDay.tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateItineraryItemAction] Error:', error);
    return { success: false, error: 'Failed to update itinerary item' };
  }
}

export async function deleteItineraryItemAction(itemId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const item = await prisma.itineraryItem.findUnique({
    where: { id: itemId },
    include: { tripDay: { include: { trip: true } } },
  });

  if (!item || item.tripDay.trip.familyId !== session.user.familyId) {
    return { success: false, error: 'Item not found' };
  }

  try {
    await prisma.itineraryItem.delete({
      where: { id: itemId },
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'itinerary_updated',
      tripId: item.tripDay.tripId,
      itemDeleted: itemId,
      updatedBy: session.user.id,
    });

    revalidatePath(`/dashboard/trips/${item.tripDay.tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteItineraryItemAction] Error:', error);
    return { success: false, error: 'Failed to delete itinerary item' };
  }
}

// ============================================================================
// TRIP COST TRACKING
// ============================================================================

export async function getTripCostSummary(tripId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    include: {
      budgetItems: true,
      days: { include: { items: { select: { cost: true, isBooked: true } } } },
      travelers: true,
    },
  });

  if (!trip) return null;

  // Calculate total from itinerary items
  let totalActual = 0;
  let totalBooked = 0;

  for (const day of trip.days) {
    for (const item of day.items) {
      if (item.cost) {
        totalActual += item.cost;
        if (item.isBooked) {
          totalBooked += item.cost;
        }
      }
    }
  }

  // Get planned totals from budget items
  const budgetSummary = trip.budgetItems.reduce(
    (acc, item) => ({
      planned: acc.planned + item.planned,
      actual: acc.actual + item.actual,
    }),
    { planned: 0, actual: 0 }
  );

  const travelerCount = trip.travelers.filter(t => t.status === 'CONFIRMED').length;

  return {
    tripId,
    tripName: trip.name,
    totalPlanned: budgetSummary.planned,
    totalActual,
    totalBooked,
    budgetRemaining: budgetSummary.planned - totalActual,
    percentUsed: budgetSummary.planned > 0 ? Math.round((totalActual / budgetSummary.planned) * 100) : 0,
    travelerCount,
    costPerPerson: travelerCount > 0 ? Math.round(totalActual / travelerCount) : 0,
    byCategory: trip.budgetItems.map(item => ({
      category: item.category,
      planned: item.planned,
      actual: item.actual,
      remaining: item.planned - item.actual,
    })),
  };
}

export async function updateTripBudgetItemAction(
  tripId: string,
  category: TripBudgetCategory,
  actual: number
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  try {
    await prisma.tripBudgetItem.upsert({
      where: { tripId_category: { tripId, category } },
      update: { actual },
      create: { tripId, category, planned: 0, actual },
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'budget_updated',
      tripId,
      tripName: trip.name,
      category,
      updatedBy: session.user.id,
    });

    revalidatePath(`/dashboard/trips/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateTripBudgetItemAction] Error:', error);
    return { success: false, error: 'Failed to update budget item' };
  }
}

// ============================================================================
// TRIP SETTLEMENT CALCULATOR
// ============================================================================

export interface TripExpense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  paidByName: string | null;
  splitAmong: string[]; // user IDs who should share this expense
  date: Date;
}

export interface SettlementPayment {
  from: { id: string; name: string | null };
  to: { id: string; name: string | null };
  amount: number;
}

export async function getTripExpenses(tripId: string): Promise<TripExpense[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    include: {
      travelers: {
        where: { status: 'CONFIRMED' },
        include: { trip: false },
      },
      days: {
        include: {
          items: {
            where: { cost: { gt: 0 } },
            select: {
              id: true,
              title: true,
              cost: true,
              createdAt: true,
              metadata: true,
            },
          },
        },
      },
    },
  });

  if (!trip) return [];

  const travelerIds = trip.travelers.map(t => t.userId);
  const expenses: TripExpense[] = [];

  for (const day of trip.days) {
    for (const item of day.items) {
      if (item.cost) {
        const metadata = item.metadata as { paidById?: string } | null;
        expenses.push({
          id: item.id,
          description: item.title,
          amount: item.cost,
          paidById: metadata?.paidById || trip.createdById,
          paidByName: null, // Will be filled in below
          splitAmong: travelerIds,
          date: item.createdAt,
        });
      }
    }
  }

  // Get user names
  if (expenses.length > 0) {
    const userIds = [...new Set(expenses.map(e => e.paidById))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    for (const expense of expenses) {
      expense.paidByName = userMap[expense.paidById] || 'Unknown';
    }
  }

  return expenses;
}

export async function calculateTripSettlement(tripId: string): Promise<{
  expenses: TripExpense[];
  totalExpenses: number;
  perPersonCost: number;
  balances: { userId: string; userName: string | null; balance: number }[];
  settlements: SettlementPayment[];
}> {
  const session = await auth();
  if (!session?.user?.familyId) {
    return { expenses: [], totalExpenses: 0, perPersonCost: 0, balances: [], settlements: [] };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    include: {
      travelers: {
        where: { status: 'CONFIRMED' },
      },
    },
  });

  if (!trip) {
    return { expenses: [], totalExpenses: 0, perPersonCost: 0, balances: [], settlements: [] };
  }

  const expenses = await getTripExpenses(tripId);
  const travelerIds = trip.travelers.map(t => t.userId);

  // Get traveler names
  const users = await prisma.user.findMany({
    where: { id: { in: travelerIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  // Calculate balances
  const balanceMap: Record<string, number> = {};
  for (const userId of travelerIds) {
    balanceMap[userId] = 0;
  }

  let totalExpenses = 0;

  for (const expense of expenses) {
    totalExpenses += expense.amount;
    const splitCount = expense.splitAmong.length;
    const perPersonShare = expense.amount / splitCount;

    // Person who paid gets credit
    if (balanceMap[expense.paidById] !== undefined) {
      balanceMap[expense.paidById] += expense.amount;
    }

    // Each person in split owes their share
    for (const userId of expense.splitAmong) {
      if (balanceMap[userId] !== undefined) {
        balanceMap[userId] -= perPersonShare;
      }
    }
  }

  const perPersonCost = travelerIds.length > 0 ? totalExpenses / travelerIds.length : 0;

  const balances = travelerIds.map(userId => ({
    userId,
    userName: userMap[userId] || 'Unknown',
    balance: Math.round(balanceMap[userId] * 100) / 100,
  }));

  // Calculate minimal settlement payments using greedy algorithm
  const settlements = calculateMinimalSettlements(balances, userMap);

  return {
    expenses,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    perPersonCost: Math.round(perPersonCost * 100) / 100,
    balances,
    settlements,
  };
}

function calculateMinimalSettlements(
  balances: { userId: string; userName: string | null; balance: number }[],
  userMap: Record<string, string | null>
): SettlementPayment[] {
  const settlements: SettlementPayment[] = [];

  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = balances
    .filter(b => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  // Greedy settlement
  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const amount = Math.min(debtor.balance, creditor.balance);

    if (amount > 0.01) {
      settlements.push({
        from: { id: debtor.userId, name: userMap[debtor.userId] },
        to: { id: creditor.userId, name: userMap[creditor.userId] },
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) debtorIdx++;
    if (creditor.balance < 0.01) creditorIdx++;
  }

  return settlements;
}

export async function recordSettlementPayment(
  tripId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  // Only the person paying can record (or admins)
  if (fromUserId !== session.user.id && !hasPermission(session.user.role, 'EDIT_TRIP')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Store settlement in trip metadata or create a settlement record
    const currentMetadata = (trip.metadata as Record<string, unknown>) || {};
    const settlements = (currentMetadata.settlements as Array<{
      from: string;
      to: string;
      amount: number;
      date: string;
      recordedBy: string;
    }>) || [];

    settlements.push({
      from: fromUserId,
      to: toUserId,
      amount,
      date: new Date().toISOString(),
      recordedBy: session.user.id,
    });

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        metadata: { ...currentMetadata, settlements },
      },
    });

    // Notify the recipient
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId: toUserId,
        familyId: session.user.familyId,
        type: 'TRIP_UPDATE',
        title: 'Settlement Payment Recorded',
        message: `${fromUser?.name || 'Someone'} recorded a payment of $${amount.toFixed(2)} for ${trip.name}`,
        data: { tripId, amount },
      },
    });

    await triggerUserNotification(toUserId, 'notification:new', {
      type: 'TRIP_UPDATE',
      title: 'Settlement Payment Recorded',
      message: `Payment of $${amount.toFixed(2)} recorded`,
    });

    await triggerFamilyEvent(session.user.familyId, 'trip:updated', {
      action: 'settlement_recorded',
      tripId,
      fromUserId,
      toUserId,
      amount,
    });

    revalidatePath(`/dashboard/trips/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[recordSettlementPayment] Error:', error);
    return { success: false, error: 'Failed to record settlement' };
  }
}

export async function getRecordedSettlements(tripId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, familyId: session.user.familyId },
    select: { metadata: true },
  });

  if (!trip) return [];

  const metadata = (trip.metadata as Record<string, unknown>) || {};
  const settlements = (metadata.settlements as Array<{
    from: string;
    to: string;
    amount: number;
    date: string;
    recordedBy: string;
  }>) || [];

  // Get user names
  const userIds = [...new Set(settlements.flatMap(s => [s.from, s.to, s.recordedBy]))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  return settlements.map(s => ({
    ...s,
    fromName: userMap[s.from] || 'Unknown',
    toName: userMap[s.to] || 'Unknown',
    recordedByName: userMap[s.recordedBy] || 'Unknown',
  }));
}
