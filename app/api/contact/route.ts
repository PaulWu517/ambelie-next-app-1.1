import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Augment globalThis to hold rate-limit maps without ts-ignore
declare global {
  // eslint-disable-next-line no-var
  var __contactRateLimit: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __contactRateLimitIp: Map<string, number> | undefined;
}

// Helpers
const getClientIp = (req: NextRequest): string => {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  const xr = req.headers.get('x-real-ip');
  if (xr) return xr.trim();
  return 'unknown';
};

const isDisposableDomain = (domain: string): boolean => {
  const blacklist = new Set([
    'mailinator.com','tempmail.com','10minutemail.com','yopmail.com','guerrillamail.com','trashmail.com',
    'getnada.com','fakemailgenerator.com','emailondeck.com','mytrashmail.com','sharklasers.com','spamgourmet.com',
    'burnermail.io','dispostable.com','moakt.com','maildrop.cc','mintemail.com','mailcatch.com','inboxbear.com'
  ]);
  return blacklist.has(domain);
};

const validateName = (name: string): boolean => {
  const n = (name || '').trim();
  if (n.length < 3 || n.length > 80) return false;
  const words = n.split(/\s+/).filter(Boolean).length;
  const vowels = (n.match(/[aeiouAEIOU]/g) || []).length;
  // 至少两个词，或至少有两个元音，避免随机无语义串
  if (words < 2 && vowels < 2) return false;
  // 仅允许常见字符（字母、空格、连字符、撇号）
  if (!/^[A-Za-z\s\-']+$/.test(n)) return false;
  return true;
};

const validateMessage = (message: string): boolean => {
  const m = (message || '').trim();
  const cjkCount = (m.match(/[\u4e00-\u9fff]/g) || []).length;
  const wordCount = m.split(/\s+/).filter(Boolean).length;
  // 至少 10 个英文单词，或至少 10 个中文字符
  if (cjkCount < 10 && wordCount < 10) return false;
  // 英文消息需要至少一个空格，避免单个令牌；中文无需空格
  if (cjkCount === 0 && !/\s/.test(m)) return false;
  // 不强制要求标点
  // 拒绝长的纯令牌/编码串
  if (/^[A-Za-z0-9+/=]{20,}$/.test(m)) return false;
  return true;
};

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

    // 简单的反机器人策略：蜜罐与最小填写时间
    if (typeof hp === 'string' && hp.trim() !== '') {
      return NextResponse.json(
        { error: 'Submission blocked by anti-bot rule' },
        { status: 429 }
      );
    }
    const nowTs = Date.now();
    const startTs = typeof formStart === 'number' ? formStart : 0;
    if (startTs > 0 && (nowTs - startTs) < 2000) {
      return NextResponse.json(
        { error: 'Submission too fast, please try again' },
        { status: 429 }
      );
    }

    // 基础速率限制：按邮箱
    const lastSentMap = globalThis.__contactRateLimit ?? new Map<string, number>();
    const nowMs = Date.now();
    const emailKey = (email?.toLowerCase?.() || '').trim();
    const lastEmail = emailKey ? lastSentMap.get(emailKey) : undefined;
    if (lastEmail && (nowMs - lastEmail) < 60_000) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }
    if (emailKey) lastSentMap.set(emailKey, nowMs);
    globalThis.__contactRateLimit = lastSentMap;

    // 基础速率限制：按 IP
    const ip = getClientIp(request);
    if (ip !== 'unknown') {
      const ipMap = globalThis.__contactRateLimitIp ?? new Map<string, number>();
      const lastIp = ipMap.get(ip);
      if (lastIp && (nowMs - lastIp) < 60_000) {
        return NextResponse.json(
          { error: 'Too many requests from your network, please try again later' },
          { status: 429 }
        );
      }
      ipMap.set(ip, nowMs);
      globalThis.__contactRateLimitIp = ipMap;
    }

    // 一次性邮箱域名拦截
    const domain = (email.split('@')[1] || '').toLowerCase();
    if (domain && isDisposableDomain(domain)) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed. Please use a valid email.' },
        { status: 422 }
      );
    }

    // 姓名与留言的格式/语义校验
    if (!validateName(name)) {
      return NextResponse.json(
        { error: 'Please enter your full name (first and last name) using letters only.' },
        { status: 422 }
      );
    }
    if (!validateMessage(message)) {
      return NextResponse.json(
        { error: 'Please provide a more detailed message (at least 10 words or 10 Chinese characters; English messages should include spaces).' },
        { status: 422 }
      );
    }

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