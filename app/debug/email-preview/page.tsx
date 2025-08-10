'use client';

import { useState, useEffect } from 'react';

const EmailPreviewPage = () => {
  const [code] = useState('276666'); // 示例验证码
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 邮件模板内容 - 与实际发送的邮件保持一致
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
        <!-- Header with Brand Image -->
        <div style="padding: 20px 30px; text-align: center; background-color: #ffffff;">
          <img src="/assets/vi/Ambelie-EMAIL VERIFICATION.png" alt="Ambelie Email Verification" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto;" />
        </div>
        
        <!-- Content -->
        <div style="padding: 50px 30px; background-color: #ffffff;">
          <p style="color: #231815; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Hello,</p>
          
          <p style="color: #231815; font-size: 16px; line-height: 1.6; margin: 0 0 40px 0;">
            You are logging into your Ambelie account. Please use the following verification code to complete the verification:
          </p>
          
          <!-- Verification Code Box -->
          <div style="background-color: #f8f9fa; border: 2px dashed #7E7A20; border-radius: 8px; padding: 30px; margin: 40px 0; text-align: center;">
            <div style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 36px; font-weight: bold; color: #7E7A20; letter-spacing: 6px; margin: 20px 0; text-align: center;">${code}</div>
            <div style="background-color: #880913; height: 2px; width: 60px; margin: 20px auto 0; border-radius: 1px;"></div>
          </div>
          
          <p style="color: #666666; margin: 30px 0; font-size: 14px; text-align: center;">Verification code expires in: 10 minutes</p>
          
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

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#231815' }}>
          邮件验证模板预览
        </h1>
        
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#231815', marginBottom: '15px' }}>设计特点：</h2>
          <ul style={{ color: '#666', lineHeight: '1.6' }}>
            <li>简约大气的黑白色调设计</li>
            <li>使用品牌黑色 (#231815) 作为主色调</li>
            <li>品牌绿 (#7E7A20) 和品牌红 (#880913) 作为点缀色</li>
            <li>现代化的排版和间距</li>
            <li>清晰的验证码展示区域</li>
            <li>专业的品牌形象展示</li>
          </ul>
        </div>
        
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div 
            dangerouslySetInnerHTML={{ __html: emailContent }}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewPage;