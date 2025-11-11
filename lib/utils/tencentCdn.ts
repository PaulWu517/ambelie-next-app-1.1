import * as crypto from 'crypto';

// Minimal Tencent Cloud API v3 (TC3-HMAC-SHA256) signer for CDN PushUrlsCache
// Falls back to COS credentials when CDN-specific credentials are not provided.

function getCloudSecret() {
  const secretId = process.env.TENCENT_CDN_SECRET_ID || process.env.TENCENT_COS_SECRET_ID;
  const secretKey = process.env.TENCENT_CDN_SECRET_KEY || process.env.TENCENT_COS_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error('Missing Tencent Cloud credentials: TENCENT_CDN_SECRET_ID/TENCENT_CDN_SECRET_KEY or TENCENT_COS_SECRET_ID/TENCENT_COS_SECRET_KEY');
  }
  return { secretId, secretKey } as const;
}

function hmacSHA256(key: Buffer | string, msg: string) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function sha256Hex(msg: string) {
  return crypto.createHash('sha256').update(msg).digest('hex');
}

export async function pushUrlsCache(urls: string[]): Promise<{ ok: boolean; requestId?: string; error?: any }> {
  try {
    if (!urls || urls.length === 0) return { ok: true };
    const { secretId, secretKey } = getCloudSecret();
    const host = 'cdn.tencentcloudapi.com';
    const service = 'cdn';
    const action = 'PushUrlsCache';
    const version = '2018-06-06';
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

    const payloadObj = { Urls: urls };
    const payload = JSON.stringify(payloadObj);
    const hashedPayload = sha256Hex(payload);

    const canonicalRequest = [
      'POST',
      '/',
      '',
      'content-type:application/json\n' + `host:${host}\n`,
      'content-type;host',
      hashedPayload,
    ].join('\n');

    const algorithm = 'TC3-HMAC-SHA256';
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = sha256Hex(canonicalRequest);
    const stringToSign = [algorithm, String(timestamp), credentialScope, hashedCanonicalRequest].join('\n');

    const secretDate = hmacSHA256('TC3' + secretKey, date);
    const secretService = hmacSHA256(secretDate, service);
    const secretSigning = hmacSHA256(secretService, 'tc3_request');
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

    const headers: Record<string, string> = {
      'Authorization': authorization,
      'Content-Type': 'application/json',
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': String(timestamp),
    };

    const resp = await fetch(`https://${host}`, { method: 'POST', headers, body: payload });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return { ok: false, error: data || { status: resp.status } };
    }
    const requestId = data?.Response?.RequestId;
    return { ok: true, requestId };
  } catch (e) {
    return { ok: false, error: e };
  }
}

export function buildPreviewUrlByCI(originalUrl: string, opts?: { width?: number; quality?: number; format?: 'webp' | 'jpg' | 'png' }) {
  const width = opts?.width ?? 640;
  const quality = opts?.quality ?? 85;
  const format = opts?.format ?? 'webp';
  const sep = originalUrl.includes('?') ? '&' : '?';
  // Using Tencent COS CI Quick Thumbnail (imageView2) mode 2: max width/height, with format + quality
  return `${originalUrl}${sep}imageView2/2/w/${width}/format/${format}/q/${quality}`;
}