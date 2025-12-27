import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let rateLimiters: Record<string, Ratelimit> = {};

function getRedis(): Redis | null {
  if (redis) return redis;
  
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  }
  
  return null;
}

export type RateLimitType = 'login' | 'signup' | 'password-reset' | 'api' | 'upload';

const RATE_LIMIT_CONFIG: Record<RateLimitType, { requests: number; window: string }> = {
  'login': { requests: 5, window: '15m' },
  'signup': { requests: 3, window: '1h' },
  'password-reset': { requests: 3, window: '1h' },
  'api': { requests: 100, window: '1m' },
  'upload': { requests: 10, window: '1m' },
};

function getRateLimiter(type: RateLimitType): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;
  
  if (rateLimiters[type]) return rateLimiters[type];
  
  const config = RATE_LIMIT_CONFIG[type];
  const duration = config.window.endsWith('m') 
    ? `${parseInt(config.window)} m` as const
    : config.window.endsWith('h') 
    ? `${parseInt(config.window)} h` as const
    : `${parseInt(config.window)} s` as const;
  
  rateLimiters[type] = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, duration),
    analytics: true,
    prefix: `ratelimit:${type}`,
  });
  
  return rateLimiters[type];
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(type);
  
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('[RateLimit] Check failed:', error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

export async function resetRateLimit(type: RateLimitType, identifier: string): Promise<void> {
  const limiter = getRateLimiter(type);
  if (!limiter) return;
  
  try {
    await limiter.resetUsedTokens(identifier);
  } catch (error) {
    console.error('[RateLimit] Reset failed:', error);
  }
}

export function isRateLimitConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
}
