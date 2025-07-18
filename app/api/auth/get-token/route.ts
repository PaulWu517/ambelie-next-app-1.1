import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getUserSession } from '@/lib/auth-storage';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 调试信息：列出所有cookie
    const allCookies = cookieStore.getAll();
    console.log('=== Token获取调试信息 ===');
    console.log('请求URL:', request.url);
    console.log('请求头:', Object.fromEntries(request.headers.entries()));
    console.log('所有Cookie数量:', allCookies.length);
    console.log('所有Cookie详情:', allCookies.map(c => ({ 
      name: c.name, 
      hasValue: !!c.value, 
      valueLength: c.value?.length || 0
    })));
    
    // 尝试从document.cookie读取（如果在客户端）
    if (typeof window !== 'undefined') {
      console.log('客户端document.cookie:', document.cookie);
    }
    
    // 方法1: 检查后端token (优先)
    const websiteUserToken = cookieStore.get('website-user-token')?.value;
    console.log('website-user-token存在:', !!websiteUserToken);
    
    if (websiteUserToken) {
      console.log('Found website-user-token, length:', websiteUserToken.length);
      return NextResponse.json({
        success: true,
        token: websiteUserToken,
        source: 'backend'
      });
    }
    
    // 方法2: 检查NextAuth session
    const session = await getServerSession(authOptions);
    if (session && (session as any).accessToken) {
      console.log('Found NextAuth session token');
      return NextResponse.json({
        success: true,
        token: (session as any).accessToken,
        source: 'nextauth'
      });
    }
    
    // 方法3: 检查本地session (备选) - 但不生成临时token
    const sessionId = cookieStore.get('ambelie-session')?.value;
    if (sessionId) {
      const userSession = getUserSession(sessionId);
      if (userSession) {
        console.log('Found local session, but no valid backend token - proceeding as guest');
        // 返回成功但不提供token，允许游客模式支付
        return NextResponse.json({
          success: true,
          token: null,
          source: 'guest',
          user: userSession,
          message: 'Guest checkout mode'
        });
      }
    }
    
    console.log('No valid token found in any source - guest mode');
    return NextResponse.json({
      success: true,
      token: null,
      source: 'guest',
      message: 'Guest checkout mode',
      debug: {
        hasWebsiteToken: !!websiteUserToken,
        hasNextAuthSession: !!session,
        hasLocalSession: !!sessionId
      }
    });
    
  } catch (error) {
    console.error('Error retrieving token:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}