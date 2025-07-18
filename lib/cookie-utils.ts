// Cookie 工具函数

/**
 * 获取指定名称的cookie值
 * @param name cookie名称
 * @returns cookie值或null
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null; // 服务端渲染时返回null
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  
  return null;
}

/**
 * 设置cookie
 * @param name cookie名称
 * @param value cookie值
 * @param options cookie选项
 */
export function setCookie(
  name: string, 
  value: string, 
  options: {
    expires?: Date;
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  if (typeof document === 'undefined') {
    return; // 服务端渲染时不执行
  }

  let cookieString = `${name}=${value}`;

  if (options.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`;
  }

  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }

  if (options.path) {
    cookieString += `; path=${options.path}`;
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += `; secure`;
  }

  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * 删除cookie
 * @param name cookie名称
 * @param path cookie路径
 * @param domain cookie域名
 */
export function deleteCookie(
  name: string, 
  path: string = '/', 
  domain?: string
): void {
  if (typeof document === 'undefined') {
    return;
  }

  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  document.cookie = cookieString;
}

/**
 * 获取网站用户token
 * @returns token字符串或null
 */
export function getWebsiteUserToken(): string | null {
  return getCookie('website-user-token');
}

/**
 * 检查用户是否已登录（基于token存在性）
 * @returns 是否已登录
 */
export function isUserLoggedIn(): boolean {
  const token = getWebsiteUserToken();
  return !!token;
}

/**
 * 清除用户登录状态
 */
export function clearUserSession(): void {
  deleteCookie('website-user-token');
  deleteCookie('ambelie-session');
}

/**
 * 解析token获取用户信息（仅用于前端显示，不用于安全验证）
 * @param token base64编码的token
 * @returns 解析后的用户信息或null
 */
export function parseTokenInfo(token: string): { userId: number; email: string; timestamp: number } | null {
  try {
    const decoded = atob(token); // base64解码
    const [userId, email, timestamp] = decoded.split(':');
    
    if (!userId || !email || !timestamp) {
      return null;
    }
    
    return {
      userId: parseInt(userId),
      email,
      timestamp: parseInt(timestamp)
    };
  } catch (error) {
    console.error('Failed to parse token:', error);
    return null;
  }
}

/**
 * 检查token是否过期（前端检查，不替代后端验证）
 * @param token base64编码的token
 * @returns 是否过期
 */
export function isTokenExpired(token: string): boolean {
  const tokenInfo = parseTokenInfo(token);
  if (!tokenInfo) {
    return true;
  }
  
  const tokenAge = Date.now() - tokenInfo.timestamp;
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
  
  return tokenAge > maxAge;
}