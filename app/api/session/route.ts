import { NextRequest, NextResponse } from 'next/server';
import { RedisService } from '@/lib/services/redis';
import { UserSession } from '@/lib/types';

const DEFAULT_SESSION_ID = 'user_alex_morgan_01';

const DEFAULT_SESSION: UserSession = {
  id: DEFAULT_SESSION_ID,
  name: 'Alex Morgan',
  email: 'alex.morgan@upcloud.dev',
  avatarUrl: '/src/assets/images/avatar_alex_morgan_1793673663751.jpg',
  role: 'Cloud Architect & Researcher',
  createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  lastActive: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId') || DEFAULT_SESSION_ID;
    let session = await RedisService.getSession(sessionId);

    if (!session) {
      session = { ...DEFAULT_SESSION, id: sessionId };
      await RedisService.setSession(session);
    }

    return NextResponse.json({
      success: true,
      session,
      cachedInRedis: RedisService.isLive(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Session fetch failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || DEFAULT_SESSION_ID;
    let session = await RedisService.getSession(sessionId) || { ...DEFAULT_SESSION, id: sessionId };

    if (body.name) session.name = body.name;
    if (body.email) session.email = body.email;
    if (body.role) session.role = body.role;
    if (body.avatarUrl) session.avatarUrl = body.avatarUrl;
    session.lastActive = new Date().toISOString();

    await RedisService.setSession(session);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Session update failed' },
      { status: 500 }
    );
  }
}
