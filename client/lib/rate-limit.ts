import { prisma } from './prisma';

/**
 * Rate Limiting Service (Database-Based)
 * 
 * SYSTEM DESIGN:
 * - Uses PostgreSQL for persistence (survives server restarts)
 * - Tracks attempts in last N hours
 * - Cleans up old records automatically
 * 
 * WHY DATABASE vs MEMORY:
 * - Persists across server restarts
 * - Works with multiple server instances (horizontal scaling)
 * - No additional services needed (Redis, etc.)
 * 
 * SECURITY STRATEGY:
 * - Limit: 3 attempts per hour per email
 * - Prevents: Email spam, server load attacks
 * - User-friendly: Clear error messages with retry time
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * Check if password reset is allowed for this email
 * 
 * ALGORITHM:
 * 1. Count attempts in last hour
 * 2. If < 3: Allow
 * 3. If >= 3: Block
 * 4. Clean up old attempts (garbage collection)
 */
export async function checkPasswordResetRateLimit(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<RateLimitResult> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  
  const MAX_ATTEMPTS = 3;
  const WINDOW_HOURS = 1;

  try {
    // Count attempts in last hour
    const recentAttempts = await prisma.passwordResetAttempt.count({
      where: {
        email,
        attemptedAt: {
          gte: oneHourAgo, // Greater than or equal to 1 hour ago
        },
      },
    });

    // Check if limit exceeded
    if (recentAttempts >= MAX_ATTEMPTS) {
      // Find oldest attempt to calculate reset time
      const oldestAttempt = await prisma.passwordResetAttempt.findFirst({
        where: {
          email,
          attemptedAt: {
            gte: oneHourAgo,
          },
        },
        orderBy: {
          attemptedAt: 'asc', // Oldest first
        },
      });

      const resetAt = oldestAttempt
        ? new Date(oldestAttempt.attemptedAt.getTime() + 60 * 60 * 1000) // +1 hour
        : new Date(now.getTime() + 60 * 60 * 1000);

      const minutesLeft = Math.ceil((resetAt.getTime() - now.getTime()) / 60000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: `Too many password reset attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
      };
    }

    // Record this attempt
    await prisma.passwordResetAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
      },
    });

    // Clean up old attempts (garbage collection)
    // WHY: Keep database clean, improve query performance
    await prisma.passwordResetAttempt.deleteMany({
      where: {
        attemptedAt: {
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Older than 24 hours
        },
      },
    });

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - recentAttempts - 1,
      resetAt: new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000),
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request (fail open for better UX)
    // WHY: Database error shouldn't block legitimate users
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      resetAt: new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000),
    };
  }
}

/**
 * Log security audit event
 * 
 * WHY: Track all security-related actions
 * WHEN: Password reset requested/completed, failed logins, etc.
 * HOW: Store in database for forensic analysis
 */
export async function logAuditEvent(data: {
  action: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId,
        email: data.email,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: data.details ? JSON.stringify(data.details) : null,
      },
    });
  } catch (error) {
    // Log error but don't throw (audit logging shouldn't break main flow)
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Get IP address from request
 * 
 * WHY: Track location of password reset attempts
 * HOW: Check multiple headers (works with proxies, load balancers)
 */
export function getClientIpAddress(request: Request): string | undefined {
  // Check common headers (works with Vercel, Cloudflare, Nginx, etc.)
  const headers = request.headers;
  
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-client-ip') ||
    undefined
  );
}

/**
 * Get user agent from request
 * 
 * WHY: Identify suspicious patterns (same user agent from many IPs)
 */
export function getClientUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}
