# 云函数配置说明

## 环境变量配置

在 `ambelie-next-app 1.1/.env.local` 中添加以下环境变量：

```bash
# 原图上传到 COS 的云函数（事件函数根路径）
NEXT_PUBLIC_SCF_UPLOAD_URL=https://1368352639-5umf4ss4xl.ap-guangzhou.tencentscf.com

# 代理 Vercel /api/virtual-tryon 的云函数 URL（带上路径 /tryon-proxy）
NEXT_PUBLIC_SCF_TRYON_URL=https://1368352639-5umf4ss4xl.ap-guangzhou.tencentscf.com/tryon-proxy
```

## 获取云函数 URL 的步骤

1. 登录腾讯云 Serverless 控制台
2. 找到云函数 `nextjs_demo-1763611229`
3. 在"触发管理"标签中，查看"函数 URL"
4. 复制完整的 URL（格式：`https://xxxxxx.ap-guangzhou.tencentscf.com`）
5. 将 URL 填入 `.env.local` 的：
   - `NEXT_PUBLIC_SCF_UPLOAD_URL`（不带路径）
   - `NEXT_PUBLIC_SCF_TRYON_URL`（在后面加上 `/tryon-proxy`）

## 示例

```bash
# 你的云函数 URL（从控制台复制）
NEXT_PUBLIC_SCF_UPLOAD_URL=https://1368352639-5umf4ss4xl.ap-guangzhou.tencentscf.com
NEXT_PUBLIC_SCF_TRYON_URL=https://1368352639-5umf4ss4xl.ap-guangzhou.tencentscf.com/tryon-proxy
```

**注意**：
- 上传原图：使用根路径（`NEXT_PUBLIC_SCF_UPLOAD_URL`）
- 代理试衣：在 URL 后加 `/tryon-proxy`（`NEXT_PUBLIC_SCF_TRYON_URL`）

## 部署云函数

1. 安装依赖：
```bash
cd 云函数
npm install
```

2. 构建 Next.js：
```bash
npm run build
```

3. 上传到腾讯云 Serverless（使用 Serverless Framework 或控制台）

4. 配置环境变量（在云函数控制台中）：
```
TENCENT_SECRET_ID=你的SecretId
TENCENT_SECRET_KEY=你的SecretKey
TENCENT_COS_BUCKET=ambelie-1368352639
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_CDN_DOMAIN=https://media.ambelie.com
```

## 测试

部署完成后，可以使用 curl 测试：

```bash
curl -X POST https://your-scf-url.apigw.tencentcs.com/release/api/upload-to-cos \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "test-123",
    "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "mime": "image/png",
    "key": "test/test-image.png"
  }'
```

预期返回：
```json
{
  "success": true,
  "url": "https://media.ambelie.com/test/test-image.png",
  "cached": false,
  "traceId": "test-123",
  "duration": 1234
}
```

