import { NextRequest, NextResponse } from 'next/server';
import { RedisService } from '@/lib/services/redis';
import { envConfig } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('auth_session')?.value;
    const headerToken = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({
        isAuthenticated: false,
        authenticated: false,
      });
    }

    const session = await RedisService.getAuthSession(token);
    if (!session) {
      return NextResponse.json({
        isAuthenticated: false,
        authenticated: false,
      });
    }

    return NextResponse.json({
      isAuthenticated: true,
      authenticated: true,
      user: {
        username: session.username,
        role: '超级管理员 (Admin)',
        loginTime: session.loginTime,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { isAuthenticated: false, error: error instanceof Error ? error.message : '验证失败' },
      { status: 500 }
    );
  }
}
