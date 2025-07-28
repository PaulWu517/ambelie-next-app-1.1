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
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    
    // 检查发送频率限制
    if (!canSendCode(email)) {
      return NextResponse.json(
        { error: 'Please wait 1 minute before resending' },
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
      const smtpPort = parseInt(process.env.SMTP_PORT || '465');
      const isSecurePort = smtpPort === 465;
      
      const transportConfig = {
        host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
        port: smtpPort,
        secure: isSecurePort, // 端口465使用隐式TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        // 添加连接超时设置
        connectionTimeout: 60000, // 60秒
        greetingTimeout: 30000, // 30秒
        socketTimeout: 60000 // 60秒
      };
      
      // 端口587会自动使用STARTTLS
      if (smtpPort === 587) {
        transportConfig.secure = false;
      }
      
      transporter = nodemailer.createTransport(transportConfig);
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
        console.log('Unable to create test account, using development mode');
        // 开发模式：在控制台显示验证码
        console.log(`=== Email Verification Code ===`);
        console.log(`Email: ${email}`);
        console.log(`Code: ${code}`);
        console.log(`Valid for: 10 minutes`);
        console.log('================================');
        
        return NextResponse.json({
          message: 'Verification code sent, please check console (development mode)',
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
        <h2 style="color: #333; text-align: center;">Ambelie Email Verification</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Hello,</p>
          <p>You are logging into your Ambelie account. Please use the following verification code to complete the verification:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; 
                         background: #fff; padding: 15px 30px; border-radius: 8px; 
                         border: 2px dashed #007bff;">${code}</span>
          </div>
          <p><strong>Verification code expires in: 10 minutes</strong></p>
          <p>If you did not request this verification code, please ignore this email.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 14px; text-align: center;">
          This email is automatically sent by Ambelie system, please do not reply
        </p>
      </div>
    `;
    
    // 发送邮件
    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@ambelie.com',
      to: email,
      subject: '[Ambelie] Email Verification Code',
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
      message: 'Verification code has been sent to your email, please check your inbox',
      debug: process.env.NODE_ENV === 'development' ? { 
        code, 
        previewUrl 
      } : undefined
    });
    
  } catch (error) {
    console.error('Failed to send verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code, please try again later' },
      { status: 500 }
    );
  }
}