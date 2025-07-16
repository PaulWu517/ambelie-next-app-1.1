# 🚀 Vercel 部署检查清单

## 📋 功能完整性检查

### ✅ 已完成功能
- [x] 基础电商网站结构
- [x] 产品展示页面
- [x] 购物车功能 (Zustand状态管理)
- [x] Stripe支付集成
- [x] 用户认证系统 (邮箱验证码登录)
- [x] 订单管理系统
- [x] 询价功能 (完整的B2B询价系统)
- [x] 邮件发送功能 (联系表单 + 询价邮件)
- [x] 响应式设计
- [x] 国际化内容 (询价系统英文化)

### 📧 邮件功能
- [x] 联系表单邮件发送
- [x] 用户注册验证码邮件
- [x] 询价邮件系统 (公司邮件 + 客户确认邮件)
- [x] 支持 Gmail/QQ 邮箱 SMTP

### 🛒 电商功能
- [x] 产品浏览和搜索
- [x] 购物车状态管理
- [x] Stripe支付流程
- [x] 订单创建和跟踪
- [x] 支付成功后购物车自动清空

### 💬 询价系统
- [x] 产品询价清单
- [x] 询价表单 (简化版，只需基本联系信息)
- [x] 询价邮件发送 (英文模板)
- [x] 提交成功后自动清空询价清单
- [x] 统一通知点 (购物车+询价的红点提醒)

## 🌐 Vercel 环境变量配置

### 📝 必需的环境变量

```env
# API 配置
NEXT_PUBLIC_API_URL=https://ambelie-backend-production.up.railway.app
NEXT_PUBLIC_STRAPI_URL=https://ambelie-backend-production.up.railway.app

# 网站配置
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app

# Stripe 支付配置
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# 邮件配置 (询价和联系表单)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# NextAuth 配置
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your-random-secret-key

# Google OAuth2 (可选)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 🔧 环境变量设置步骤

1. **登录 Vercel Dashboard**
   - 访问 https://vercel.com/dashboard
   - 选择您的项目

2. **设置环境变量**
   - 点击 Settings > Environment Variables
   - 逐个添加上述环境变量
   - 确保为 Production, Preview, Development 都设置

3. **获取 Vercel 域名**
   - 部署后在 Project Overview 获取域名
   - 更新 `NEXT_PUBLIC_SITE_URL` 为实际域名

## 🛠️ 代码检查

### ✅ 依赖项检查
- [x] `@stripe/stripe-js` - Stripe支付
- [x] `@stripe/react-stripe-js` - Stripe React组件
- [x] `zustand` - 状态管理
- [x] `nodemailer` - 邮件发送
- [x] `next-auth` - 用户认证
- [x] `lucide-react` - 图标库

### ✅ Next.js 配置
- [x] `next.config.ts` 配置正确
- [x] 图片优化配置 (remote patterns)
- [x] TypeScript 配置

### ✅ 路由检查
- [x] `/` - 首页
- [x] `/products/[slug]` - 产品详情页
- [x] `/cart` - 购物车页面
- [x] `/checkout` - 结账页面
- [x] `/order/success` - 支付成功页面
- [x] `/orders` - 订单列表页面
- [x] `/orders/[id]` - 订单详情页面
- [x] `/inquiry` - 询价页面
- [x] `/auth/login` - 登录页面
- [x] `/contact` - 联系页面

### ✅ API 路由检查
- [x] `/api/contact` - 联系表单邮件
- [x] `/api/inquiry/send` - 询价邮件发送
- [x] `/api/auth/send-code` - 发送验证码
- [x] `/api/auth/verify-code` - 验证登录
- [x] `/api/auth/me` - 获取用户信息
- [x] `/api/auth/logout` - 用户登出

## 🔍 部署前最终检查

### 🏗️ 构建检查
```bash
npm run build
```
确保构建成功，无错误和警告。

### 🌍 环境变量引用检查
所有代码中的环境变量都有正确的回退值：

- `process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app'`
- `process.env.NEXT_PUBLIC_API_URL`
- `process.env.NEXT_PUBLIC_SITE_URL`
- `process.env.SMTP_HOST`
- `process.env.SMTP_USER`
- `process.env.SMTP_PASSWORD`

### 🔄 功能流程测试

#### 购物流程
1. [ ] 添加商品到购物车
2. [ ] 查看购物车
3. [ ] 进入结账页面
4. [ ] 完成支付
5. [ ] 查看订单详情

#### 询价流程
1. [ ] 添加商品到询价清单
2. [ ] 填写询价表单
3. [ ] 提交询价
4. [ ] 收到确认邮件
5. [ ] 询价清单自动清空

#### 用户认证
1. [ ] 邮箱登录
2. [ ] 验证码验证
3. [ ] 查看个人订单

## 🚨 注意事项

### 📧 邮件配置重要提醒
1. **Gmail 用户**：需要开启"应用专用密码"
2. **QQ 邮箱用户**：需要开启SMTP服务并获取授权码
3. **测试邮件发送**：部署后立即测试联系表单和询价功能

### 🔒 安全检查
- [ ] API密钥不在前端代码中暴露
- [ ] 环境变量正确配置在Vercel中
- [ ] NEXTAUTH_SECRET使用强随机字符串

### 🌐 外部服务依赖
- [ ] Railway后端服务正常运行
- [ ] Stripe账户配置正确
- [ ] 邮件SMTP服务可用

## 📈 部署后验证

### 1. 基础功能测试
- [ ] 网站加载正常
- [ ] 页面导航正常
- [ ] 图片显示正常

### 2. 支付功能测试
- [ ] 使用Stripe测试卡号测试支付
- [ ] 测试卡号：`4242 4242 4242 4242`

### 3. 邮件功能测试
- [ ] 联系表单邮件发送
- [ ] 用户登录验证码邮件
- [ ] 询价邮件发送

### 4. 响应式测试
- [ ] 移动端显示正常
- [ ] 平板端显示正常
- [ ] 桌面端显示正常

## 🔄 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "准备生产环境部署"
   git push origin main
   ```

2. **连接 Vercel**
   - Vercel Dashboard > New Project
   - 导入 GitHub 仓库
   - 配置环境变量

3. **首次部署**
   - 等待构建完成
   - 获取分配的域名

4. **更新环境变量**
   - 将 `NEXT_PUBLIC_SITE_URL` 更新为实际域名
   - 重新部署

5. **最终测试**
   - 完整功能测试
   - 邮件发送测试
   - 支付流程测试

## 📞 问题排查

如遇问题，检查：
1. Vercel 构建日志
2. 浏览器开发者工具
3. 环境变量配置
4. 外部服务状态 (Railway, Stripe)

---

**部署完成后，您将拥有一个功能完整的B2B古董家具电商网站，包含完整的购物、支付、用户管理和询价功能！** 🎉 