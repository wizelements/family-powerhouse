import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { pusherServer } from '@/lib/pusher/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!pusherServer) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 500 });
  }

  const formData = await req.formData();
  const socketId = formData.get('socket_id') as string;
  const channel = formData.get('channel_name') as string;

  if (!socketId || !channel) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Validate channel access
  if (channel.startsWith('private-family-')) {
    const familyId = channel.replace('private-family-', '').split('-channel-')[0];
    if (familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (channel.startsWith('presence-family-')) {
    const familyId = channel.replace('presence-family-', '');
    if (familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (channel.startsWith('private-user-')) {
    const userId = channel.replace('private-user-', '');
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Authorize
  if (channel.startsWith('presence-')) {
    const presenceData = {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    };
    const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);
    return NextResponse.json(authResponse);
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}
