import { NextRequest, NextResponse } from 'next/server';
import { RedisService } from '@/lib/services/redis';

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('auth_session')?.value;
    const headerToken = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = cookieToken || headerToken;
    if (token) {
      await RedisService.removeAuthSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: '已成功退出登录',
    });

    response.cookies.delete('auth_session');
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登出失败' },
      { status: 500 }
    );
  }
}
