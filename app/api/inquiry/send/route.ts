import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

type TransporterConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

const createTransporter = ({ host, port, user, pass }: TransporterConfig) => {
  const isSecurePort = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecurePort, // 端口465使用隐式TLS，端口587使用STARTTLS
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      user,
      pass,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const { customerInfo, inquiryItems, submissionDate, totalItems } = await request.json();

    const inquirySmtpHost = process.env.INQUIRY_SMTP_HOST || 'smtp.qq.com';
    const inquirySmtpPort = parseInt(process.env.INQUIRY_SMTP_PORT || '465');
    const inquirySmtpUser = process.env.INQUIRY_SMTP_USER;
    const inquirySmtpPassword = process.env.INQUIRY_SMTP_PASSWORD;
    const inquiryReceiverEmail = process.env.INQUIRY_RECEIVER_EMAIL || 'info@ambelie.com';

    const defaultSmtpHost = process.env.SMTP_HOST || 'smtp.exmail.qq.com';
    const defaultSmtpPort = parseInt(process.env.SMTP_PORT || '465');
    const defaultSmtpUser = process.env.SMTP_USER;
    const defaultSmtpPassword = process.env.SMTP_PASSWORD;

    if (!customerInfo.email || !customerInfo.firstName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!inquiryItems || inquiryItems.length === 0) {
      return NextResponse.json(
        { error: 'Inquiry list cannot be empty' },
        { status: 400 }
      );
    }

    if (!inquirySmtpUser || !inquirySmtpPassword) {
      return NextResponse.json(
        { error: 'Inquiry SMTP configuration is incomplete' },
        { status: 500 }
      );
    }

    if (!defaultSmtpUser || !defaultSmtpPassword) {
      return NextResponse.json(
        { error: 'Default SMTP configuration is incomplete' },
        { status: 500 }
      );
    }

    // 构建邮件内容
    const companyEmail = inquiryReceiverEmail;
    
    // 构建商品列表HTML
    const itemsListHtml = inquiryItems.map((item: any, index: number) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 15px 10px; vertical-align: top;">
          <strong>${item.name}</strong><br>
          ${item.period ? `<span style="color: #666;">Period: ${item.period}</span><br>` : ''}
          ${item.dimensions ? `<span style="color: #666;">Dimensions: ${item.dimensions}</span><br>` : ''}
          ${item.materials ? `<span style="color: #666;">Materials: ${item.materials}</span><br>` : ''}
          ${item.origin ? `<span style="color: #666;">Origin: ${item.origin}</span><br>` : ''}
          ${item.designer ? `<span style="color: #666;">Designer: ${item.designer}</span><br>` : ''}
          <span style="color: #999; font-size: 0.9em;">Added: ${new Date(item.inquiryDate).toLocaleDateString('en-US')}</span>
        </td>
        <td style="padding: 15px 10px; vertical-align: top;">
          <strong>${item.price && item.price > 0 ? `$${item.price.toLocaleString()}` : 'Price on inquiry'}</strong>
        </td>
      </tr>
    `).join('');

    // 公司邮件模板
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Product Inquiry - AMBELIE</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Solena-Regular', 'Poppins', 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #333; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2rem; font-family: 'Solena-Regular', 'Times New Roman', 'Georgia', serif; font-weight: 400;">🔍 New Product Inquiry</h1>
          <p style="margin: 10px 0 0 0; font-size: 1.1rem; font-family: 'Poppins', 'Arial', sans-serif; font-weight: 300;">AMBELIE Inquiry System</p>
        </div>

        <div style="background-color: #fff; padding: 25px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; margin-bottom: 25px;">
          <h2 style="color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; font-family: 'Solena-Regular', 'Times New Roman', 'Georgia', serif; font-weight: 400;">Customer Information</h2>
          <table style="width: 100%; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 8px 0;">${customerInfo.firstName} ${customerInfo.lastName || ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;">${customerInfo.email}</td>
            </tr>
            ${customerInfo.phone ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;">${customerInfo.phone}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Submission Date:</td>
              <td style="padding: 8px 0;">${new Date(submissionDate).toLocaleString('en-US')}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fff; padding: 25px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; font-family: 'Solena-Regular', 'Times New Roman', 'Georgia', serif; font-weight: 400;">
            Product Inquiry List (${totalItems} items)
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #ddd; font-family: 'Poppins', 'Arial', sans-serif; font-weight: 600;">Product Information</th>
                <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #ddd; width: 120px; font-family: 'Poppins', 'Arial', sans-serif; font-weight: 600;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #666;">
          <p style="margin: 0; font-weight: bold; color: #333;">Please respond to customer inquiry promptly</p>
          <p style="margin: 5px 0 0 0; color: #666;">We recommend responding to customer inquiries within 24 hours to provide excellent customer service.</p>
        </div>

        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 0.9em; border-top: 1px solid #ddd; padding-top: 20px;">
          <p>This email was automatically sent by the AMBELIE Inquiry System</p>
          <p><strong>Website:</strong> <a href="https://www.ambelie.com/" style="color: #666;">ambelie.com</a></p>
          <p>For questions, please contact the system administrator</p>
        </div>
      </body>
      </html>
    `;

    // 发给内部团队的通知邮件使用独立 SMTP，避免公司邮箱自发自收。
    const inquiryTransporter = createTransporter({
      host: inquirySmtpHost,
      port: inquirySmtpPort,
      user: inquirySmtpUser,
      pass: inquirySmtpPassword,
    });

    const defaultTransporter = createTransporter({
      host: defaultSmtpHost,
      port: defaultSmtpPort,
      user: defaultSmtpUser,
      pass: defaultSmtpPassword,
    });
    
    const mailOptions = {
      from: `"AMBELIE Inquiry System" <${inquirySmtpUser}>`,
      to: companyEmail,
      subject: `🔍 New Inquiry: Product Inquiry - ${customerInfo.firstName} ${customerInfo.lastName || ''}`,
      html: emailHtml,
      replyTo: customerInfo.email,
    };

    await inquiryTransporter.sendMail(mailOptions);

    // 发送确认邮件给客户
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Thank You for Your Inquiry - AMBELIE</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Solena-Regular', 'Poppins', 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #333; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 1.8rem; font-family: 'Solena-Regular', 'Times New Roman', 'Georgia', serif; font-weight: 400; color: #ffffff;">Thank You for Your Inquiry</h1>
          <div style="margin: 15px 0 0 0; text-align: center;">
            <img src="https://www.ambelie.com/assets/vi/Ambelie_whitelogo.png" alt="AMBELIE Logo" style="height: 35px; margin: 0 auto;" />
          </div>
        </div>

        <div style="background-color: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1rem; margin-bottom: 20px; color: #333;">Dear ${customerInfo.firstName},</p>
          
          <p style="color: #333;">Thank you for your interest in our products. We have received your inquiry for <strong>${totalItems} item${totalItems > 1 ? 's' : ''}</strong> and will respond within 24 hours.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #666;">
            <h3 style="margin: 0 0 15px 0; color: #333; font-family: 'Solena-Regular', 'Times New Roman', 'Georgia', serif; font-weight: 400;">Your Inquiry Summary:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${inquiryItems.map((item: any) => `<li style="margin-bottom: 8px; color: #333;"><strong>${item.name}</strong></li>`).join('')}
            </ul>
          </div>
          
          <p style="color: #333;">Our team will review your inquiry and provide detailed information about pricing, availability, and any additional details you may need.</p>
          
          <p style="color: #333;">In the meantime, feel free to browse our collection or contact us if you have any immediate questions.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.ambelie.com/" style="display: inline-block; background-color: #555; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: 500; font-family: 'Poppins', 'Arial', sans-serif;">Visit Our Website</a>
          </div>
          
          <p style="margin-top: 30px; color: #333;">Best regards,<br><strong>AMBELIE</strong></p>
          
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
      </body>
      </html>
    `;

    const customerMailOptions = {
      from: `"AMBELIE" <${defaultSmtpUser}>`,
      to: customerInfo.email,
      subject: 'Thank You for Your Inquiry - AMBELIE',
      html: customerEmailHtml,
    };

    await defaultTransporter.sendMail(customerMailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Inquiry sent successfully' 
    });

  } catch (error) {
    console.error('Error sending inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to send inquiry' },
      { status: 500 }
    );
  }
}
