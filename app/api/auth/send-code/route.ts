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
    
    // 邮件内容 - 简约大气的黑白设计
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ambelie Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="padding: 20px 30px; text-align: center; background-color: #ffffff;">
            <img src="https://ambelie.com/assets/vi/Ambelie-EMAIL VERIFICATION.png" alt="Ambelie Email Verification" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Content -->
          <div style="padding: 50px 30px; background-color: #ffffff;">
            <p style="color: #231815; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Hello,</p>
            
            <p style="color: #231815; font-size: 16px; line-height: 1.6; margin: 0 0 40px 0;">
              You are logging into your Ambelie account. Please use the following verification code to complete the verification:
            </p>
            
            <!-- Verification Code -->
            <div style="text-align: center; margin: 50px 0;">
              <div style="display: inline-block; background-color: #ffffff; border: 2px solid #231815; padding: 25px 40px;">
                <span style="font-size: 36px; font-weight: 600; color: #231815; letter-spacing: 8px; font-family: 'Georgia', 'Times New Roman', serif;">${code}</span>
              </div>
            </div>
            
            <p style="color: #666666; font-size: 14px; text-align: center; margin: 30px 0;">Verification code expires in: 10 minutes</p>
            
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
              If you did not request this verification code, please ignore this email.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.5;">
              This email is automatically sent by Ambelie system, please do not reply<br>
              <span style="color: #7E7A20;">AMBELIE</span> | Curated Art & Antiques
            </p>
          </div>
        </div>
      </body>
      </html>
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