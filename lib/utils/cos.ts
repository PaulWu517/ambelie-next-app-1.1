import COS from 'cos-nodejs-sdk-v5';

function getCosEnv() {
  const secretId = process.env.TENCENT_COS_SECRET_ID;
  const secretKey = process.env.TENCENT_COS_SECRET_KEY;
  // 默认 bucket/region/CDN 域名，减少环境变量依赖
  const bucket = process.env.TENCENT_COS_BUCKET || 'ambelie-1368352639';
  const region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';
  const domain = process.env.TENCENT_COS_DOMAIN;
  if (!secretId || !secretKey) {
    throw new Error('Missing COS credentials: TENCENT_COS_SECRET_ID/TENCENT_COS_SECRET_KEY');
  }
  return { secretId, secretKey, bucket, region, domain } as const;
}

function getCosClient() {
  const { secretId, secretKey } = getCosEnv();
  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  return cos;
}

export function buildTryonKey(traceId: string, mime: string) {
  const m = (mime || '').toLowerCase();
  const ext = m.includes('png') ? 'png' : (m.includes('webp') ? 'webp' : 'jpg');
  const basePath = process.env.TRYON_COS_BASE_PATH || 'tryon-results/';
  return `${basePath}${traceId}.${ext}`;
}

export async function uploadBufferToCOS(buf: Buffer, key: string, mime: string): Promise<{ url: string }> {
  const { bucket, region, domain } = getCosEnv();
  const cos = getCosClient();
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: key,
      Body: buf,
      ContentType: mime,
      ACL: 'public-read'
    }, (err: any, data: any) => {
      if (err) return reject(err);
      // 优先使用国际域名，其次 CDN 域名，最后拼接默认域名
      const base = domain
        ? `https://${domain}`
        : (process.env.TENCENT_COS_CDN_DOMAIN || 'https://media.ambelie.com').replace(/\/$/, '');
      const url = `${base}/${key}`;
      resolve({ url });
    });
  });
}

export async function getBufferFromCOS(key: string): Promise<{ buf: Buffer, mime: string }> {
  const { bucket, region, domain } = getCosEnv();
  const cos = getCosClient();
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: bucket, Region: region, Key: key }, (err: any, data: any) => {
      if (err) return reject(err);
      const body = data?.Body;
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
      const ct = data?.Headers?.['content-type'] || data?.ContentType || 'image/png';
      resolve({ buf, mime: ct });
    });
  });
}

// 仅检查对象是否存在，返回少量元信息（更轻量）
export async function objectExistsInCOS(key: string): Promise<{ exists: boolean, contentType?: string, contentLength?: number }> {
  const { bucket, region } = getCosEnv();
  const cos = getCosClient();
  return new Promise((resolve) => {
    // Tencent COS SDK 支持 headObject；若出现 404 或 NoSuchResource，认为不存在
    // 其他错误也按不存在处理，以避免阻塞主流程
    cos.headObject({ Bucket: bucket, Region: region, Key: key }, (err: any, data: any) => {
      if (err) {
        // 常见返回：{ statusCode: 404, code: 'NoSuchResource' }
        return resolve({ exists: false });
      }
      const headers = data?.Headers || {};
      const ct = headers['content-type'] || data?.ContentType;
      const lenStr = headers['content-length'] || (data?.ContentLength ? String(data.ContentLength) : undefined);
      const contentLength = lenStr ? parseInt(lenStr, 10) : undefined;
      resolve({ exists: true, contentType: ct, contentLength });
    });
  });
}