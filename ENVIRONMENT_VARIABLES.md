# 环境变量说明

## 邮件相关
- `SMTP_HOST`: SMTP服务器地址 (例如: smtp.gmail.com)
- `SMTP_PORT`: SMTP端口 (例如: 587)
- `SMTP_USER`: 发送邮件的邮箱地址
- `SMTP_PASSWORD`: 邮箱密码或应用密码
- `EMAIL_USER`: 接收询价邮件的邮箱地址

## Stripe 支付
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe 公开密钥
- `NEXT_PUBLIC_STRAPI_API_TOKEN`: Strapi API 访问令牌

## API 地址
- `NEXT_PUBLIC_API_URL`: 后端 API 地址 (例如: https://ambelie-backend-production.up.railway.app)
- `STRAPI_URL`: 本地开发时的 Strapi 地址 (例如: http://localhost:1337)

## 网站配置
- `NEXT_PUBLIC_SITE_URL`: 前端网站的完整URL地址
  - 用途: 在邮件模板中生成正确的产品链接、网站logo链接等
  - 示例: https://ambelie-next-app-1-1.vercel.app
  - 注意: 必须包含协议(https://)，不能以斜杠结尾

## 认证相关
- `NEXTAUTH_URL`: NextAuth 认证回调地址
- `NEXTAUTH_SECRET`: NextAuth 加密密钥

## Google OAuth2
- `GOOGLE_CLIENT_ID`: Google OAuth2 客户端ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth2 客户端密钥

## 示例 .env.local 文件
```
# 网站配置
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# API 配置
NEXT_PUBLIC_API_URL=https://your-backend.com
STRAPI_URL=http://localhost:1337

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_USER=info@ambelie.com

# Stripe 配置
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRAPI_API_TOKEN=...

# 认证配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## COS 与虚拟试穿

- `TENCENT_COS_SECRET_ID`: 腾讯云 COS 密钥 ID
- `TENCENT_COS_SECRET_KEY`: 腾讯云 COS 密钥 Key
- `TENCENT_COS_BUCKET`: COS 存储桶名称（默认 `ambelie-1368352639`）
- `TENCENT_COS_REGION`: COS 地域（默认 `ap-guangzhou`）
- `TENCENT_COS_CDN_DOMAIN`: 对象访问域名（默认 `https://media.ambelie.com`）
- `TRYON_COS_BASE_PATH`: 试穿结果存储前缀（默认 `tryon-results/`）
- `TENCENT_COS_USE_ACCELERATE`: 开启全球加速（`1`/`true`）
- `TENCENT_COS_USE_INTERNAL_ACCELERATE`: 开启内网全球加速（同地域内网环境下 `1`/`true`）
- `TENCENT_COS_DOMAIN`: 自定义 COS 域名（如 `ambelie-1368352639.cos.accelerate.myqcloud.com`）

## AI 与网络

- `GEMINI_API_KEY`: Google Generative Language API 密钥
- `GENERATION_TEMPERATURE`: 生成温度（默认 `0`）
- `GENERATION_TOP_P`: TopP（默认 `0.98`）
- `GENERATION_TOP_K`: TopK（默认 `20`）
- `GENERATION_SEED`: 随机种子（可选）
- `HTTPS_PROXY` / `HTTP_PROXY`: 参考图拉取与调用 Gemini 的代理（可选）
- `DIAG_LOG_PATH`: 服务端诊断日志落盘路径（可选）