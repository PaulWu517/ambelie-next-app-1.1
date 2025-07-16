# Ambelie 支付系统测试指南

## 🚀 快速测试步骤

### 1. 启动开发服务器
```bash
cd "ambelie-next-app 1.1"
npm run dev
```

### 2. 测试支付流程
1. 访问 http://localhost:3000
2. 添加产品到购物车
3. 进入购物车：http://localhost:3000/cart
4. 点击 "Proceed to Checkout"
5. 填写客户信息
6. 点击 "Continue to Payment"

### 3. Stripe测试卡号
- **成功支付**：`4242 4242 4242 4242`
- **支付失败**：`4000 0000 0000 0002`
- **需要验证**：`4000 0025 0000 3155`
- 有效期：任何未来日期（如 `12/34`）
- CVC：任何3位数字（如 `123`）
- 邮编：任何5位数字（如 `12345`）

## 🔍 检查点

### ✅ 前端检查
- [ ] 结账页面正常显示
- [ ] 客户信息表单可以填写
- [ ] 订单摘要显示正确
- [ ] 点击支付按钮后跳转到Stripe

### ✅ Stripe Checkout检查
- [ ] Stripe支付页面正常加载
- [ ] 可以输入测试卡号
- [ ] 地址信息收集正常
- [ ] 支付处理正常

### ✅ 成功页面检查
- [ ] 支付成功后跳转到成功页面
- [ ] 显示订单详情
- [ ] 购物车已清空
- [ ] 按钮链接正常工作

## 🐛 常见问题排查

### 问题1：无法跳转到Stripe
**可能原因**：
- 环境变量配置错误
- 后端API无法访问
- CORS配置问题

**检查方法**：
1. 检查浏览器控制台错误
2. 检查网络请求状态
3. 验证 `NEXT_PUBLIC_API_URL` 配置

### 问题2：支付成功但无法返回
**可能原因**：
- Success URL配置错误
- 前端路由问题

**检查方法**：
1. 检查 `NEXT_PUBLIC_SITE_URL` 配置
2. 检查成功页面路由

### 问题3：购物车未清空
**可能原因**：
- 成功页面逻辑错误
- Zustand状态管理问题

**检查方法**：
1. 检查浏览器本地存储
2. 检查购物车状态更新

## 🔧 环境变量检查

### 前端 (.env.local)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=https://ambelie-backend-production.up.railway.app
NEXT_PUBLIC_SITE_URL=https://ambelie-next-app-1-1.vercel.app
```

### 后端 (Railway)
```env
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (可选，用于webhook)
PAYMENT_CURRENCY=USD
PAYMENT_SUCCESS_URL=https://ambelie-next-app-1-1.vercel.app/order/success
PAYMENT_CANCEL_URL=https://ambelie-next-app-1-1.vercel.app/cart
FRONTEND_URL=https://ambelie-next-app-1-1.vercel.app
```

## 📊 测试数据记录

### 成功测试记录
- [ ] 本地开发环境测试 ✅
- [ ] 生产环境测试 ⏳
- [ ] 移动端测试 ⏳
- [ ] 不同浏览器测试 ⏳

### 测试用例
- [ ] 正常支付流程
- [ ] 支付失败处理
- [ ] 用户取消支付
- [ ] 网络中断处理
- [ ] 重复支付检测

## 🔄 下一步计划

1. **完成基础测试** ✅
2. **配置Stripe Webhook** ⏳
3. **生产环境部署** ⏳
4. **邮件通知功能** ⏳
5. **订单管理界面** ⏳

## 📞 技术支持

如遇到问题，请检查：
1. 浏览器开发者工具的控制台和网络选项卡
2. Railway应用的部署日志
3. Stripe Dashboard的事件日志

记录错误信息和复现步骤，便于快速定位问题。 