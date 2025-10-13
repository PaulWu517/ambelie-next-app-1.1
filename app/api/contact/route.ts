import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Augment globalThis to hold rate-limit map without ts-ignore
declare global {
  // Using var to allow re-declaration across modules in Node
  // Map key: lowercased email, value: last submission timestamp (ms)
  // eslint-disable-next-line no-var
  var __contactRateLimit: Map<string, number> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 表单数据验证 + 反机器人校验
    const { enquiryType, email, name, country, message, hearAboutUs, hp, formStart } = body;
    
    if (!enquiryType || !email || !name || !country || !message) {
      return NextResponse.json(
        { error: 'Please fill in all required fields' },
        { status: 400 }
      );
    }

    // 简单的反机器人策略：
    // 1) 蜜罐字段不得有值
    if (typeof hp === 'string' && hp.trim() !== '') {
      return NextResponse.json(
        { error: 'Submission blocked by anti-bot rule' },
        { status: 429 }
      );
    }
    // 2) 填表耗时不得过短（例如 < 2 秒）
    const nowTs = Date.now();
    const startTs = typeof formStart === 'number' ? formStart : 0;
    if (startTs > 0 && (nowTs - startTs) < 2000) {
      return NextResponse.json(
        { error: 'Submission too fast, please try again' },
        { status: 429 }
      );
    }

    // 额外：基础速率限制，按邮箱在 60 秒内仅允许提交一次
    const lastSentMap = globalThis.__contactRateLimit ?? new Map<string, number>();
    const nowMs = Date.now();
    const key = (email?.toLowerCase?.() || '').trim();
    const last = key ? lastSentMap.get(key) : undefined;
    if (last && (nowMs - last) < 60_000) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }
    if (key) lastSentMap.set(key, nowMs);
    globalThis.__contactRateLimit = lastSentMap;

    // 生产环境真实邮件发送逻辑保持不变
    // 创建邮件发送器
    let transporter;
    let testAccount = null;
    
    if (process.env.NODE_ENV === 'development') {
      // 开发环境：创建Ethereal测试账户
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
        // 如果无法创建测试账户，使用一个虚拟的transporter
        transporter = {
          sendMail: async (mailOptions: any) => {
            console.log('=== Development Mode Email ===');
            console.log('Send to:', mailOptions.to);
            console.log('Subject:', mailOptions.subject);
            console.log('Content:', mailOptions.html || mailOptions.text);
            console.log('==============================');
            return {
              messageId: 'dev-' + Date.now(),
              envelope: { from: mailOptions.from, to: [mailOptions.to] },
              accepted: [mailOptions.to],
              rejected: [],
              pending: [],
              response: '250 Message accepted for delivery'
            };
          }
        } as any;
      }
    } else {
      // 生产环境：使用真实的邮件服务
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        throw new Error('Production environment requires SMTP credentials configuration');
      }
      
      const smtpPort = parseInt(process.env.SMTP_PORT || '465');
      const isSecurePort = smtpPort === 465;
      
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
        port: smtpPort,
        secure: isSecurePort, // 端口465使用隐式TLS，端口587使用STARTTLS
        tls: {
          rejectUnauthorized: false
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    
    // 如果环境变量中有SMTP配置，即使在开发环境也使用真实邮件服务
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.NODE_ENV === 'development') {
      console.log('SMTP configuration detected, using real email service');
      const smtpPort = parseInt(process.env.SMTP_PORT || '465');
      const isSecurePort = smtpPort === 465;
      
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
        port: smtpPort,
        secure: isSecurePort, // 端口465使用隐式TLS，端口587使用STARTTLS
        tls: {
          rejectUnauthorized: false
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    
    // 邮件内容
    const emailContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Inquiry Type:</strong> ${enquiryType}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Country/Region:</strong> ${country}</p>
      <p><strong>How did you hear about us:</strong> ${hearAboutUs || 'Not provided'}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Submitted at: ${new Date().toLocaleString('en-US')}</small></p>
    `;
    
    // 发送邮件到指定邮箱
    const fromEmail = process.env.SMTP_USER || 'noreply@ambelie.com';
    // 内部通知邮件
    const internalMailOptions = {
      from: fromEmail,
      to: 'Info@ambelie.com', // Internal team's email address
      subject: `Ambelie Contact Form - ${enquiryType} - ${name}`,
      html: emailContent,
      replyTo: email,
    };
    
    // 给用户的确认邮件
    const customerConfirmationEmail = {
      from: fromEmail,
      to: email, // Customer's email address
      subject: 'Thank you for contacting Ambelie',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <p>Dear ${name},</p>
          
          <p>Thank you for reaching out to us. We've received your enquiry and will get back to you as soon as possible.</p>
          
          <p>Our team is currently reviewing your message, and we aim to respond within 1-2 working days.</p>
          
          <p>In the meantime, please feel free to browse our latest collections or follow us on Instagram for more inspiration.</p>
          
          <p>Warm regards,<br>
          <strong>AMBELIE</strong></p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="font-size: 12px; color: #666; line-height: 1.5;">
            <p><strong>AMBELIE</strong><br>
            Shanghai Showroom: No. 21, Kangping Road, Xuhui District<br>
            Hangzhou Showroom: No. 1788 Hongning Road, Xiaoshan District<br>
            Email: Info@ambelie.com<br>
            Instagram: @ambelie_gallery</p>
          </div>
        </div>
      `,
    };
    
    // 发送邮件
    const info = await transporter.sendMail(internalMailOptions);
    await transporter.sendMail(customerConfirmationEmail);
    
    console.log('Email sent successfully:', info.messageId);
    
    // 只在使用真实Ethereal账户时显示预览链接
    const previewUrl = testAccount ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }
    
    return NextResponse.json(
      { 
        message: 'Message sent successfully! We will reply to you as soon as possible.',
        testInfo: process.env.NODE_ENV === 'development' ? {
          messageId: info.messageId,
          previewUrl: previewUrl
        } : undefined
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Sending failed, please try again later' },
      { status: 500 }
    );
  }
}