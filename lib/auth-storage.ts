// 邮箱验证码临时存储
interface VerificationCode {
  code: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

interface UserSession {
  email: string;
  name?: string;
  createdAt: Date;
}

// 内存存储（生产环境应使用Redis或数据库）
const verificationCodes = new Map<string, VerificationCode>();
const userSessions = new Map<string, UserSession>();

// 生成6位随机验证码
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 存储验证码
export function storeVerificationCode(email: string, code: string): void {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期
  
  const verificationData = {
    code,
    email,
    createdAt: new Date(),
    expiresAt,
  };
  
  verificationCodes.set(email, verificationData);
  
  console.log(`=== 存储验证码 ===`);
  console.log(`邮箱: ${email}`);
  console.log(`验证码: ${code}`);
  console.log(`创建时间: ${verificationData.createdAt}`);
  console.log(`过期时间: ${expiresAt}`);
  console.log(`当前存储的验证码数量: ${verificationCodes.size}`);
  console.log('==================');
  
  // 清理过期的验证码
  cleanupExpiredCodes();
}

// 验证验证码
export function verifyCode(email: string, inputCode: string): boolean {
  const stored = verificationCodes.get(email);
  
  console.log(`=== verifyCode 函数调试 ===`);
  console.log(`邮箱: ${email}`);
  console.log(`输入验证码: ${inputCode}`);
  console.log(`存储的验证码对象:`, stored);
  
  if (!stored) {
    console.log(`原因: 没有找到邮箱 ${email} 的验证码`);
    console.log(`当前存储的所有验证码:`, Array.from(verificationCodes.keys()));
    return false;
  }
  
  // 检查是否过期
  if (new Date() > stored.expiresAt) {
    console.log(`原因: 验证码已过期`);
    console.log(`当前时间: ${new Date()}`);
    console.log(`过期时间: ${stored.expiresAt}`);
    verificationCodes.delete(email);
    return false;
  }
  
  // 验证码匹配
  if (stored.code === inputCode) {
    console.log(`验证码匹配成功！`);
    verificationCodes.delete(email); // 验证成功后删除
    return true;
  }
  
  console.log(`原因: 验证码不匹配`);
  console.log(`存储验证码: ${stored.code}`);
  console.log(`输入验证码: ${inputCode}`);
  console.log('=============================');
  
  return false;
}

// 创建用户会话
export function createUserSession(email: string, name?: string): string {
  const sessionId = generateSessionId();
  
  userSessions.set(sessionId, {
    email,
    name,
    createdAt: new Date(),
  });
  
  return sessionId;
}

// 获取用户会话
export function getUserSession(sessionId: string): UserSession | null {
  return userSessions.get(sessionId) || null;
}

// 删除用户会话
export function deleteUserSession(sessionId: string): void {
  userSessions.delete(sessionId);
}

// 生成会话ID
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 清理过期的验证码
function cleanupExpiredCodes(): void {
  const now = new Date();
  for (const [email, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(email);
    }
  }
}

// 检查邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 限制发送频率（防止滥用）
const sendLimits = new Map<string, Date>();

export function canSendCode(email: string): boolean {
  const lastSent = sendLimits.get(email);
  if (!lastSent) return true;
  
  // 1分钟内只能发送一次
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  
  if (lastSent > oneMinuteAgo) {
    return false;
  }
  
  return true;
}

export function recordSendTime(email: string): void {
  sendLimits.set(email, new Date());
} 