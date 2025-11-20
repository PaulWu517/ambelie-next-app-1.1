# 云函数配置说明

## 环境变量配置

在 `ambelie-next-app 1.1/.env.local` 中添加以下环境变量：

```bash
# 腾讯云函数 URL（helloworld-1763623809）
NEXT_PUBLIC_SCF_UPLOAD_URL=https://1368352639-5umf4ss4xl.ap-guangzhou.tencentscf.com
```

## 获取云函数 URL 的步骤

1. 登录腾讯云 Serverless 控制台
2. 找到云函数 `nextjs_demo-1763611229`
3. 在"触发管理"标签中，查看"函数 URL"
4. 复制完整的 URL（格式：`https://xxxxxx.ap-guangzhou.tencentscf.com`）
5. 将 URL 填入 `.env.local` 的 `NEXT_PUBLIC_SCF_UPLOAD_URL`

## 示例

```bash
# 你的云函数 URL（从控制台复制）
NEXT_PUBLIC_SCF_UPLOAD_URL=https://1368352639-hz4wdf78sx.ap-guangzhou.tencentscf.com
```

**注意**：不需要添加 `/api/upload-to-cos` 路径，直接使用函数 URL 根路径即可。

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

