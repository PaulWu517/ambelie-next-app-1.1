import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-storage';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const websiteUserToken = cookieStore.get('website-user-token')?.value;

    // 优先使用 Website User token
    if (websiteUserToken) {
      try {
        const backendResponse = await fetch(`${process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/website-users/me`, {
          headers: {
            'Authorization': `Bearer ${websiteUserToken}`
          }
        });

        if (backendResponse.ok) {
          const userData = await backendResponse.json();
          return NextResponse.json({ ...userData, isGuest: false });
        }
        
        // 如果 token 无效 (e.g., 401 from backend), 清除无效的 token cookie
        const response = NextResponse.json(
          { error: '用户未认证' },
          { status: 401 }
        );
        response.cookies.set('website-user-token', '', { maxAge: -1, path: '/' });
        return response;

      } catch (error) {
        console.error('Error fetching user from backend:', error);
        return NextResponse.json(
          { error: '后端服务错误' },
          { status: 500 }
        );
      }
    }

    // 如果没有 website-user-token，则检查访客 session
    const sessionId = cookieStore.get('ambelie-session')?.value;
    if (sessionId) {
      const session = getUserSession(sessionId);
      if (session) {
        return NextResponse.json({ 
          email: session.email, 
          name: session.name,
          isGuest: true // 明确标记为访客
        });
      }
    }
    
    // 如果两种凭证都没有，则视为未登录
    return NextResponse.json(
      { error: '用户未认证' },
      { status: 401 }
    );
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}