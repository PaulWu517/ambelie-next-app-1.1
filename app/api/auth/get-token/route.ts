import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
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
    
    // 方法3: 检查本地session (备选)
    const sessionId = cookieStore.get('ambelie-session')?.value;
    if (sessionId) {
      const userSession = getUserSession(sessionId);
      if (userSession) {
        console.log('Found local session, generating temporary token');
        // 为本地session生成一个临时token
        const tempToken = `temp_${sessionId}_${Date.now()}`;
        return NextResponse.json({
          success: true,
          token: tempToken,
          source: 'local',
          user: userSession
        });
      }
    }
    
    console.log('No valid token found in any source');
    return NextResponse.json({
      success: false,
      message: 'No token found',
      debug: {
        hasWebsiteToken: !!websiteUserToken,
        hasNextAuthSession: !!session,
        hasLocalSession: !!sessionId
      }
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error retrieving token:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}