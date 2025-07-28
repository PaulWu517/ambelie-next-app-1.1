import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 表单数据验证
    const { enquiryType, email, name, country, message, hearAboutUs } = body;
    
    if (!enquiryType || !email || !name || !country || !message) {
      return NextResponse.json(
        { error: 'Please fill in all required fields' },
        { status: 400 }
      );
    }
    
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
    const mailOptions = {
      from: fromEmail,
      to: 'pwu709724@gmail.com',
      subject: `Ambelie Contact Form - ${enquiryType} - ${name}`,
      html: emailContent,
      replyTo: email,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // 发送确认邮件给用户
    const confirmationEmail = {
      from: fromEmail,
      to: email,
      subject: 'Thank you for contacting Ambelie',
      html: `
        <h2>Thank you for your contact</h2>
        <p>Dear ${name},</p>
        <p>Thank you for contacting Ambelie. We have received your message and will reply to you within 24 hours.</p>
        <p>For urgent matters, please call directly:</p>
        <ul>
          <li>Shanghai Showroom: +86 21 6473 7638</li>
          <li>Hangzhou Showroom: +86 571 8871 9025</li>
        </ul>
        <p>Best regards,<br>Ambelie Team</p>
        <hr>
        <p><small>This is an automated email from Ambelie contact system</small></p>
      `,
    };
    
    await transporter.sendMail(confirmationEmail);
    
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