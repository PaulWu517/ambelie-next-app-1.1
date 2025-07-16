import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { 
  generateVerificationCode, 
  storeVerificationCode, 
  isValidEmail, 
  canSendCode, 
  recordSendTime 
} from '@/lib/auth-storage';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    // 验证邮箱格式
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }
    
    // 检查发送频率限制
    if (!canSendCode(email)) {
      return NextResponse.json(
        { error: '请等待1分钟后再重新发送' },
        { status: 429 }
      );
    }
    
    // 生成验证码
    const code = generateVerificationCode();
    storeVerificationCode(email, code);
    recordSendTime(email);
    
    // 创建邮件发送器（复用联系表单的邮件配置）
    let transporter;
    let testAccount = null;
    
    // 如果有SMTP配置，优先使用真实邮件服务
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } else if (process.env.NODE_ENV === 'development') {
      // 开发环境：创建Ethereal测试账户或使用控制台模式
      try {
        testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (error) {
        console.log('无法创建测试账户，使用开发模式');
        // 开发模式：在控制台显示验证码
        console.log(`=== 邮箱验证码 ===`);
        console.log(`邮箱: ${email}`);
        console.log(`验证码: ${code}`);
        console.log(`有效期: 10分钟`);
        console.log('==================');
        
        return NextResponse.json({
          message: '验证码已发送，请查看控制台（开发模式）',
          debug: process.env.NODE_ENV === 'development' ? { code } : undefined
        });
      }
    } else {
      // 生产环境没有配置SMTP
      throw new Error('生产环境需要配置SMTP凭据');
    }
    
    // 邮件内容
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Ambelie 邮箱验证</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>您好，</p>
          <p>您正在登录 Ambelie 账户，请使用以下验证码完成验证：</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; 
                         background: #fff; padding: 15px 30px; border-radius: 8px; 
                         border: 2px dashed #007bff;">${code}</span>
          </div>
          <p><strong>验证码有效期：10分钟</strong></p>
          <p>如果您没有请求此验证码，请忽略此邮件。</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 14px; text-align: center;">
          此邮件由 Ambelie 系统自动发送，请勿回复
        </p>
      </div>
    `;
    
    // 发送邮件
    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@ambelie.com',
      to: email,
      subject: '【Ambelie】邮箱验证码',
      html: emailContent,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('验证码邮件发送成功:', info.messageId);
    
    // 如果是测试邮件，提供预览链接
    const previewUrl = testAccount ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log('预览链接:', previewUrl);
    }
    
    return NextResponse.json({
      message: '验证码已发送到您的邮箱，请注意查收',
      debug: process.env.NODE_ENV === 'development' ? { 
        code, 
        previewUrl 
      } : undefined
    });
    
  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json(
      { error: '发送验证码失败，请稍后重试' },
      { status: 500 }
    );
  }
} 