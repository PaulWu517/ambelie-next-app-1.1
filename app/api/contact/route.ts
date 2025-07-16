import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 表单数据验证
    const { enquiryType, email, name, country, message, hearAboutUs } = body;
    
    if (!enquiryType || !email || !name || !country || !message) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
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
        console.log('无法创建测试账户，使用开发模式');
        // 如果无法创建测试账户，使用一个虚拟的transporter
        transporter = {
          sendMail: async (mailOptions: any) => {
            console.log('=== 开发模式邮件 ===');
            console.log('发送给:', mailOptions.to);
            console.log('主题:', mailOptions.subject);
            console.log('内容:', mailOptions.html || mailOptions.text);
            console.log('==================');
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
        throw new Error('生产环境需要配置SMTP凭据');
      }
      
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    
    // 如果环境变量中有SMTP配置，即使在开发环境也使用真实邮件服务
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.NODE_ENV === 'development') {
      console.log('检测到SMTP配置，使用真实邮件服务发送');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    
    // 邮件内容
    const emailContent = `
      <h2>新的联系表单提交</h2>
      <p><strong>询问类型:</strong> ${enquiryType}</p>
      <p><strong>姓名:</strong> ${name}</p>
      <p><strong>邮箱:</strong> ${email}</p>
      <p><strong>国家/地区:</strong> ${country}</p>
      <p><strong>了解渠道:</strong> ${hearAboutUs || '未提供'}</p>
      <p><strong>消息内容:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>提交时间: ${new Date().toLocaleString('zh-CN')}</small></p>
    `;
    
    // 发送邮件到指定邮箱
    const fromEmail = process.env.SMTP_USER || 'noreply@ambelie.com';
    const mailOptions = {
      from: fromEmail,
      to: 'pwu709724@gmail.com',
      subject: `Ambelie 联系表单 - ${enquiryType} - ${name}`,
      html: emailContent,
      replyTo: email,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // 发送确认邮件给用户
    const confirmationEmail = {
      from: fromEmail,
      to: email,
      subject: '感谢您联系 Ambelie',
      html: `
        <h2>感谢您的联系</h2>
        <p>亲爱的 ${name}，</p>
        <p>感谢您联系 Ambelie。我们已收到您的消息，将在 24 小时内回复您。</p>
        <p>如有紧急事项，请直接致电：</p>
        <ul>
          <li>上海展厅：+86 21 6473 7638</li>
          <li>杭州展厅：+86 571 8871 9025</li>
        </ul>
        <p>此致，<br>Ambelie 团队</p>
        <hr>
        <p><small>这是一封测试邮件，实际部署时将使用真实的邮件服务</small></p>
      `,
    };
    
    await transporter.sendMail(confirmationEmail);
    
    console.log('邮件发送成功:', info.messageId);
    
    // 只在使用真实Ethereal账户时显示预览链接
    const previewUrl = testAccount ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log('预览链接:', previewUrl);
    }
    
    return NextResponse.json(
      { 
        message: '消息发送成功！我们会尽快回复您。',
        testInfo: process.env.NODE_ENV === 'development' ? {
          messageId: info.messageId,
          previewUrl: previewUrl
        } : undefined
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('邮件发送错误:', error);
    return NextResponse.json(
      { error: '发送失败，请稍后重试' },
      { status: 500 }
    );
  }
} 