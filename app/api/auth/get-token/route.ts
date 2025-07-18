import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getUserSession } from '@/lib/auth-storage';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 方法1: 检查后端token (优先)
    const websiteUserToken = cookieStore.get('website-user-token')?.value;
    if (websiteUserToken) {
      console.log('Found website-user-token');
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