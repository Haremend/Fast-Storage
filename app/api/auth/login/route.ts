import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/config';
import { RedisService } from '@/lib/services/redis';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入管理员账号与密码' },
        { status: 400 }
      );
    }

    // Anti-Brute-Force Rate Limiting (Max 5 attempts per 60 seconds per IP)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateCheck = await RedisService.rateLimitDemo(`login_attempt:${ip}`, 5, 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `登录尝试过于频繁，已触发防爆破保护，请 ${rateCheck.resetInSeconds || 60} 秒后再试`,
        },
        { status: 429 }
      );
    }

    // Compare with single-user admin credentials
    const validUser = envConfig.adminUsername.trim();
    const validPass = envConfig.adminPassword;

    const inputUser = username.trim();
    const inputPass = typeof password === 'string' ? password : String(password);

    if (
      inputUser.toLowerCase() !== validUser.toLowerCase() ||
      (inputPass !== validPass && inputPass.trim() !== validPass.trim())
    ) {
      return NextResponse.json(
        { success: false, error: '账号或密码不正确' },
        { status: 401 }
      );
    }

    // Generate secure session token
    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    await RedisService.setAuthSession(sessionToken, validUser);

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      message: '登录成功',
      user: {
        username: validUser,
        role: '超级管理员 (Admin)',
        loginTime: new Date().toISOString(),
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'auth_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登录发生未知错误' },
      { status: 500 }
    );
  }
}
