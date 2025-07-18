# Vercel 支付功能修复指南

## 问题描述
在 Vercel 部署后，支付功能出现"支付初始化失败"的问题，本地测试正常。日志显示"Found local session, generating temporary token"。

## 根本原因
1. **Token 验证机制不匹配**：前端生成的临时 token 格式与后端期望的格式不一致
2. **环境变量配置不完整**：Vercel 环境中缺少必要的 API URL 配置
3. **认证流程在生产环境下失效**：前后端通信问题导致无法获取有效的后端 token

## 修复方案

### 1. 前端修复（已完成）
- ✅ 修改 `/api/auth/get-token` 路由，不再生成无效的临时 token
- ✅ 改为游客模式支付，当没有有效 token 时返回 `token: null`
- ✅ 更新 checkout 页面，正确处理游客模式支付

### 2. Vercel 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

```bash
# 必需的环境变量
NEXT_PUBLIC_API_URL=https://ambelie-backend-production.up.railway.app
NEXT_PUBLIC_STRAPI_URL=https://ambelie-backend-production.up.railway.app
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# NextAuth 配置
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your-secret-here

# 可选：Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. 配置步骤

1. **登录 Vercel Dashboard**
   - 进入你的项目
   - 点击 "Settings" 标签
   - 选择 "Environment Variables"

2. **添加环境变量**
   - 逐一添加上述环境变量
   - 确保 `NEXT_PUBLIC_API_URL` 指向正确的后端地址
   - 确保 `NEXT_PUBLIC_SITE_URL` 是你的 Vercel 应用域名

3. **重新部署**
   - 添加环境变量后，触发重新部署
   - 或者在 "Deployments" 标签中重新部署最新版本

### 4. 验证修复

部署完成后，检查以下内容：

1. **控制台日志**：
   - 应该看到 "游客模式支付" 而不是 "Found local session, generating temporary token"
   - 支付请求应该成功发送到后端

2. **支付流程**：
   - 添加商品到购物车
   - 进入 checkout 页面
   - 填写客户信息
   - 点击 "Continue to Payment" 应该成功跳转到 Stripe

3. **网络请求**：
   - 检查浏览器开发者工具的 Network 标签
   - `/api/auth/get-token` 应该返回 `{"success": true, "token": null, "source": "guest"}`
   - `/api/payments/create-checkout-session` 应该成功返回 Stripe URL

## 技术细节

### 修复前的问题
```javascript
// 问题代码：生成无效的临时 token
const tempToken = `temp_${sessionId}_${Date.now()}`;
```

### 修复后的解决方案
```javascript
// 解决方案：游客模式支付
return NextResponse.json({
  success: true,
  token: null,
  source: 'guest',
  message: 'Guest checkout mode'
});
```

### 后端兼容性
后端支付控制器已经正确处理游客模式：
```javascript
// 后端会检查 Authorization 头，如果没有则作为游客处理
let websiteUser = null;
const authHeader = ctx.request.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
  // 尝试验证 token
} else {
  // 游客模式，继续处理支付
}
```

## 常见问题

**Q: 为什么本地正常，Vercel 部署后失败？**
A: 本地环境可能有不同的 session 存储机制，而 Vercel 的无服务器环境不支持持久化的内存存储。

**Q: 游客模式支付安全吗？**
A: 是的，支付处理完全由 Stripe 处理，游客模式只是不关联用户账户，支付安全性不受影响。

**Q: 登录用户的支付会受影响吗？**
A: 不会，如果用户有有效的后端 token，仍然会使用认证模式支付。只有在没有有效 token 时才会回退到游客模式。

## 后续优化建议

1. **统一环境变量命名**：将所有 `NEXT_PUBLIC_STRAPI_URL` 替换为 `NEXT_PUBLIC_API_URL`
2. **改进错误处理**：添加更详细的错误日志和用户友好的错误提示
3. **会话管理优化**：考虑使用数据库或 Redis 替代内存存储
4. **监控和告警**：添加支付失败的监控和告警机制