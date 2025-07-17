import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-storage';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('ambelie-session')?.value;
    const websiteUserToken = cookieStore.get('website-user-token')?.value;
    
    // 优先使用Website User token
    if (websiteUserToken) {
      try {
        const backendResponse = await fetch(`${process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/website-users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${websiteUserToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (backendResponse.ok) {
          const backendResult = await backendResponse.json();
          return NextResponse.json({
            user: {
              email: backendResult.user.email,
              name: backendResult.user.name || null,
              loginTime: backendResult.user.lastLoginAt,
              firstName: backendResult.user.firstName,
              lastName: backendResult.user.lastName,
              phone: backendResult.user.phone,
            }
          });
        }
      } catch (backendError) {
        console.error('Backend user info retrieval failed:', backendError);
        // 如果后端失败，继续使用本地session
      }
    }
    
    // 回退到本地session
    if (!sessionId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    
    const userSession = getUserSession(sessionId);
    
    if (!userSession) {
      return NextResponse.json(
        { error: '会话已过期，请重新登录' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      user: {
        email: userSession.email,
        name: userSession.name || null,
        loginTime: userSession.createdAt,
      }
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
} 