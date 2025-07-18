import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, createUserSession, isValidEmail } from '@/lib/auth-storage';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, code, name } = await request.json();
    
    // 验证邮箱格式
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }
    
    // 验证验证码格式
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: '请输入6位验证码' },
        { status: 400 }
      );
    }
    
    // 开发环境：允许使用特殊验证码绕过验证
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestCode = isDevelopment && code === '888888';
    
    // 验证验证码（添加调试信息）
    console.log(`=== 验证码验证调试 ===`);
    console.log(`邮箱: ${email}`);
    console.log(`用户输入验证码: ${code}`);
    console.log(`开发环境: ${isDevelopment}`);
    console.log(`测试验证码: ${isTestCode}`);
    
    const isValidCode = isTestCode || verifyCode(email, code);
    console.log(`验证结果: ${isValidCode}`);
    console.log('========================');
    
    if (!isValidCode) {
      const errorMessage = isDevelopment 
        ? '验证码无效或已过期，请重新获取（开发环境可使用 888888 作为测试验证码）'
        : '验证码无效或已过期，请重新获取';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    // 验证成功，创建用户会话
    const sessionId = createUserSession(email, name);
    
    // 设置HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('ambelie-session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });
    
    console.log(`用户登录成功: ${email}`);
    
    // 调用后端API进行用户验证和创建
    try {
      const backendUrl = `${process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/website-users/verify-email-login`;
      const baseUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
      
      console.log('=== 调用后端API ===');
      console.log('Base URL:', baseUrl);
      console.log('Full URL:', backendUrl);
      console.log('Body:', { email, code, name });
      
      // 先测试基本连接
      try {
        const healthCheck = await fetch(`${baseUrl}/admin/information`, { method: 'GET' });
        console.log('Backend health check status:', healthCheck.status);
      } catch (healthError) {
        console.log('Backend health check failed:', (healthError as Error).message);
      }
      
      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, name }),
      });

      console.log('Backend Response Status:', backendResponse.status);
      console.log('Backend Response Headers:', Object.fromEntries(backendResponse.headers.entries()));
      
      // 检查响应是否是JSON格式
      const contentType = backendResponse.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await backendResponse.text();
        console.log('Non-JSON Response Text:', textResponse);
        throw new Error(`Expected JSON response but got: ${contentType}. Response: ${textResponse}`);
      }

      const backendResult = await backendResponse.json();

      if (backendResponse.ok && backendResult.success) {
        console.log('=== 前端登录成功处理 ===');
        console.log('后端返回的token长度:', backendResult.token?.length);
        console.log('用户信息:', backendResult.user);
        
        // 存储后端返回的token
        const response = NextResponse.json({
          message: 'Login successful!',
          user: backendResult.user,
          token: backendResult.token
        });

        // 设置包含后端token的cookie - 修复：允许前端访问
        const cookieOptions = {
          httpOnly: false, // 改为false，允许前端JavaScript访问
          secure: process.env.NODE_ENV === 'production',
          sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'strict' | 'lax' | 'none',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        };
        
        console.log('前端Cookie设置选项:', cookieOptions);
        response.cookies.set('website-user-token', backendResult.token, cookieOptions);
        console.log('✅ 前端Cookie设置完成');

        return response;
      } else {
        console.log('Backend returned non-success response:', backendResult);
        return NextResponse.json(
          { error: backendResult.message || 'Backend verification failed' },
          { status: 400 }
        );
      }
    } catch (backendError) {
      console.error('=== Backend API call failed ===');
      console.error('Error type:', (backendError as Error).constructor.name);
      console.error('Error message:', (backendError as Error).message);
      console.error('Full error:', backendError);
      console.log('使用前端本地验证逻辑作为备选方案');
      // 如果后端不可用，使用原有逻辑
    }

    return NextResponse.json({
      message: '登录成功',
      user: {
        email,
        name: name || null,
      }
    });
    
  } catch (error) {
    console.error('验证登录失败:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}