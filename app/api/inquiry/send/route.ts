import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// 创建邮件发送器
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const { customerInfo, inquiryItems, submissionDate, totalItems } = await request.json();

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

    // 构建邮件内容
    const companyEmail = 'info@ambelie.com';
    
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
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2c3e50; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2rem;">🔍 New Product Inquiry</h1>
          <p style="margin: 10px 0 0 0; font-size: 1.1rem;">AMBELIE Inquiry System</p>
        </div>

        <div style="background-color: #fff; padding: 25px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Customer Information</h2>
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
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Product Inquiry List (${totalItems} items)
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #ddd;">Product Information</th>
                <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #ddd; width: 120px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 30px; padding: 20px; background-color: #e8f4fd; border-radius: 8px; border-left: 4px solid #3498db;">
          <p style="margin: 0; font-weight: bold; color: #2c3e50;">Please respond to customer inquiry promptly</p>
          <p style="margin: 5px 0 0 0; color: #666;">We recommend responding to customer inquiries within 24 hours to provide excellent customer service.</p>
        </div>

        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 0.9em; border-top: 1px solid #ddd; padding-top: 20px;">
          <p>This email was automatically sent by the AMBELIE Inquiry System</p>
          <p><strong>Website:</strong> <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ambelie.com'}" style="color: #3498db;">ambelie.com</a></p>
          <p>For questions, please contact the system administrator</p>
        </div>
      </body>
      </html>
    `;

    // 发送邮件
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"AMBELIE Inquiry System" <${process.env.SMTP_USER}>`,
      to: companyEmail,
      subject: `🔍 New Inquiry: Product Inquiry - ${customerInfo.firstName} ${customerInfo.lastName || ''}`,
      html: emailHtml,
      replyTo: customerInfo.email,
    };

    await transporter.sendMail(mailOptions);

    // 发送确认邮件给客户
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Thank You for Your Inquiry - AMBELIE</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2c3e50; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 1.8rem;">Thank You for Your Inquiry!</h1>
          <p style="margin: 10px 0 0 0; font-size: 1.1rem;">AMBELIE</p>
        </div>

        <div style="background-color: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1rem; margin-bottom: 20px;">Dear ${customerInfo.firstName},</p>
          
          <p>Thank you for your interest in our products. We have received your inquiry for <strong>${totalItems} item${totalItems > 1 ? 's' : ''}</strong> and will respond within 24 hours.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3498db;">
            <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Your Inquiry Summary:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${inquiryItems.map((item: any) => `<li style="margin-bottom: 8px;"><strong>${item.name}</strong></li>`).join('')}
            </ul>
          </div>
          
          <p>Our team will review your inquiry and provide detailed information about pricing, availability, and any additional details you may need.</p>
          
          <p>In the meantime, feel free to browse our collection or contact us if you have any immediate questions.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ambelie.com'}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: 500;">Visit Our Website</a>
          </div>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The AMBELIE Team</strong></p>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #999; font-size: 0.9em;">
          <p>AMBELIE | <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ambelie.com'}" style="color: #3498db;">ambelie.com</a></p>
          <p>This is an automated confirmation email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    const customerMailOptions = {
      from: `"AMBELIE" <${process.env.SMTP_USER}>`,
      to: customerInfo.email,
      subject: 'Thank You for Your Inquiry - AMBELIE',
      html: customerEmailHtml,
    };

    await transporter.sendMail(customerMailOptions);

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