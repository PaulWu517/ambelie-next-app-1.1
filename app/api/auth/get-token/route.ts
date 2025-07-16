import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const websiteUserToken = cookieStore.get('website-user-token')?.value;
    
    if (websiteUserToken) {
      return NextResponse.json({
        success: true,
        token: websiteUserToken
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No token found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get token'
    }, { status: 500 });
  }
} 