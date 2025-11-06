import COS from 'cos-nodejs-sdk-v5';

function getCosEnv() {
  const secretId = process.env.TENCENT_COS_SECRET_ID;
  const secretKey = process.env.TENCENT_COS_SECRET_KEY;
  const bucket = process.env.TENCENT_COS_BUCKET;
  const region = process.env.TENCENT_COS_REGION;
  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error('Missing COS config: TENCENT_COS_SECRET_ID/TENCENT_COS_SECRET_KEY/TENCENT_COS_BUCKET/TENCENT_COS_REGION');
  }
  return { secretId, secretKey, bucket, region } as const;
}

function getCosClient() {
  const { secretId, secretKey } = getCosEnv();
  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  return cos;
}

export function buildTryonKey(traceId: string, mime: string) {
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const basePath = process.env.TRYON_COS_BASE_PATH || 'tryon-results/';
  return `${basePath}${traceId}.${ext}`;
}

export async function uploadBufferToCOS(buf: Buffer, key: string, mime: string): Promise<{ url: string }> {
  const { bucket, region } = getCosEnv();
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
      const cdnDomain = process.env.TENCENT_COS_CDN_DOMAIN;
      const base = cdnDomain ? cdnDomain.replace(/\/$/, '') : `https://${bucket}.cos.${region}.myqcloud.com`;
      const url = `${base}/${key}`;
      resolve({ url });
    });
  });
}

export async function getBufferFromCOS(key: string): Promise<{ buf: Buffer, mime: string }> {
  const { bucket, region } = getCosEnv();
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