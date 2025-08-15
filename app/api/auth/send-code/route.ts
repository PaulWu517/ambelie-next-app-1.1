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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Solena-Regular', 'Poppins', 'Arial', sans-serif; background-color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #333; padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 400; margin: 0; letter-spacing: 2px; font-family: 'Solena-Regular', 'Times New Roman', 'Georgia', serif;">EMAIL VERIFICATION</h1>
            <div style="margin: 15px 0 0 0; text-align: center;">
              <img src="https://www.ambelie.com/assets/vi/Ambelie_whitelogo.png" alt="AMBELIE Logo" style="height: 35px; margin: 0 auto;" />
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 50px 30px; background-color: #ffffff; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; font-family: 'Poppins', 'Arial', sans-serif;">Hello,</p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 40px 0; font-family: 'Poppins', 'Arial', sans-serif;">
              You are logging into your Ambelie account. Please use the following verification code to complete the verification:
            </p>
            
            <!-- Verification Code -->
            <div style="text-align: center; margin: 50px 0;">
              <div style="display: inline-block; background-color: #ffffff; border: 2px solid #333; padding: 25px 40px;">
                <span style="font-size: 36px; font-weight: 600; color: #333; letter-spacing: 8px; font-family: 'Poppins', 'Arial', sans-serif;">${code}</span>
              </div>
            </div>
            
            <div style="margin: 40px 0;">
              <p style="color: #333; font-size: 14px; margin: 0; text-align: left; font-family: 'Poppins', 'Arial', sans-serif;">Verification code expires in: 10 minutes</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; font-family: 'Poppins', 'Arial', sans-serif;">
              If you did not request this verification code, please ignore this email.
            </p>
            
            <!-- Email Signature -->
            <div style="margin-top: 30px; padding: 25px; background-color: #f8f8f8; border-radius: 8px;">
              <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <img src="https://www.ambelie.com/assets/vi/Ambelie_VI_Logos.png" alt="AMBELIE Logo" style="height: 40px; margin-right: 15px;" />
                </div>
                <p style="margin: 0 0 5px 0; font-size: 0.8rem; color: #666; font-family: 'Poppins', 'Arial', sans-serif;">NO.21 KANGPING ROAD</p>
                <p style="margin: 0 0 5px 0; font-size: 0.8rem; color: #666; font-family: 'Poppins', 'Arial', sans-serif;">SHANGHAI</p>
                <p style="margin: 0; font-size: 0.8rem; color: #666; font-family: 'Poppins', 'Arial', sans-serif;">
                  <a href="https://www.instagram.com/ambelie_gallery" style="color: #666; text-decoration: underline; font-weight: 500;">@AMBELIE</a>
                </p>
              </div>
              <div style="border-top: 1px solid #ddd; padding-top: 15px; text-align: center;">
                <p style="margin: 0; font-size: 0.85rem; color: #999; font-family: 'Poppins', 'Arial', sans-serif;">This is an automated confirmation email. Please do not reply to this message.</p>
                <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #999; font-family: 'Poppins', 'Arial', sans-serif;">© 2024 AMBELIE. All rights reserved.</p>
              </div>
            </div>
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