import { NextRequest, NextResponse } from 'next/server';
import { deleteUserSession } from '@/lib/auth-storage';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('ambelie-session')?.value;
    const websiteUserToken = cookieStore.get('website-user-token')?.value;
    
    if (sessionId) {
      // 删除服务器端会话
      deleteUserSession(sessionId);
      
      // 删除cookie
      cookieStore.delete('ambelie-session');
      
      console.log('Local session logout');
    }

    if (websiteUserToken) {
      // 删除website user token cookie
      cookieStore.delete('website-user-token');
      
      console.log('Website user logout');
    }
    
    return NextResponse.json({
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 