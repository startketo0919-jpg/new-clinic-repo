import { Request, Response, NextFunction } from 'express';

/**
 * Extracts real client IP address safely considering reverse proxies (e.g. Cloudflare, Hostinger, Nginx)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || 'unknown-ip';
}

/**
 * Enterprise HTTP Security Headers
 * Mitigates XSS, clickjacking, MIME-sniffing, and protocol downgrade attacks
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

interface RateLimitRecord {
  timestamps: number[];
}

// 1. Failed Login Rate Limiter: Max 5 failed attempts per 15 mins per IP
const loginFailedAttempts = new Map<string, number[]>();

export function checkLoginRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins

  const attempts = (loginFailedAttempts.get(ip) || []).filter(t => now - t < windowMs);
  loginFailedAttempts.set(ip, attempts);

  if (attempts.length >= 5) {
    const remainingSecs = Math.ceil((attempts[0] + windowMs - now) / 1000);
    return res.status(429).json({
      error: `Too many failed login attempts. Account temporarily locked against brute-force attacks. Please try again in ${remainingSecs} seconds.`
    });
  }

  next();
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const attempts = (loginFailedAttempts.get(ip) || []).filter(t => now - t < windowMs);
  attempts.push(now);
  loginFailedAttempts.set(ip, attempts);
}

export function clearLoginFailures(ip: string) {
  loginFailedAttempts.delete(ip);
}

// 2. OTP Send Rate Limiter: Max 3 requests per 10 minutes per IP & Email
const otpSendAttempts = new Map<string, number[]>();

export function checkOtpSendRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const email = (req.body?.email || req.body?.identifier || '').toLowerCase().trim();
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 mins

  // Check by IP
  const ipAttempts = (otpSendAttempts.get(`ip:${ip}`) || []).filter(t => now - t < windowMs);
  otpSendAttempts.set(`ip:${ip}`, ipAttempts);

  // Check by Email
  const emailAttempts = email ? (otpSendAttempts.get(`email:${email}`) || []).filter(t => now - t < windowMs) : [];
  if (email) otpSendAttempts.set(`email:${email}`, emailAttempts);

  if (ipAttempts.length >= 5 || emailAttempts.length >= 3) {
    return res.status(429).json({
      error: 'Too many OTP requests. To protect against email bombing and resource abuse, please wait 10 minutes.'
    });
  }

  next();
}

export function recordOtpSent(ip: string, email?: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;

  const ipAttempts = (otpSendAttempts.get(`ip:${ip}`) || []).filter(t => now - t < windowMs);
  ipAttempts.push(now);
  otpSendAttempts.set(`ip:${ip}`, ipAttempts);

  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    const emailAttempts = (otpSendAttempts.get(`email:${cleanEmail}`) || []).filter(t => now - t < windowMs);
    emailAttempts.push(now);
    otpSendAttempts.set(`email:${cleanEmail}`, emailAttempts);
  }
}

// 3. OTP Verification Rate Limiter: Max 5 attempts per OTP key
const otpVerifyFailures = new Map<string, number>();

export function recordOtpVerifyFailure(key: string): number {
  const current = (otpVerifyFailures.get(key) || 0) + 1;
  otpVerifyFailures.set(key, current);
  return current;
}

export function clearOtpVerifyFailures(key: string) {
  otpVerifyFailures.delete(key);
}

// 4. Anti-Scraping / General API Flood Limiter: 120 calls per minute per IP for mutating routes
const generalApiTracker = new Map<string, number[]>();

export function apiAntiAbuseLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 min

  const timestamps = (generalApiTracker.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= 120) {
    return res.status(429).json({
      error: 'Rate limit exceeded: Too many rapid requests. Please slow down.'
    });
  }

  timestamps.push(now);
  generalApiTracker.set(ip, timestamps);
  next();
}

// Cleanup stale memory every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of loginFailedAttempts.entries()) {
    const valid = times.filter(t => now - t < 15 * 60 * 1000);
    if (valid.length === 0) loginFailedAttempts.delete(key);
    else loginFailedAttempts.set(key, valid);
  }
  for (const [key, times] of otpSendAttempts.entries()) {
    const valid = times.filter(t => now - t < 10 * 60 * 1000);
    if (valid.length === 0) otpSendAttempts.delete(key);
    else otpSendAttempts.set(key, valid);
  }
  for (const [key, times] of generalApiTracker.entries()) {
    const valid = times.filter(t => now - t < 60 * 1000);
    if (valid.length === 0) generalApiTracker.delete(key);
    else generalApiTracker.set(key, valid);
  }
}, 15 * 60 * 1000);
