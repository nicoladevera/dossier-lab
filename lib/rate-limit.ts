interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limiter (sufficient for single-instance deployment)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Pre-configured rate limiters
export const RATE_LIMITS = {
  ingestion: {
    perHour: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
    perDay: { maxRequests: 200, windowMs: 24 * 60 * 60 * 1000 },
  },
  query: {
    perMinute: { maxRequests: 30, windowMs: 60 * 1000 },
    perDay: { maxRequests: 500, windowMs: 24 * 60 * 60 * 1000 },
  },
};

export function checkIngestionRateLimit(userId: string): {
  allowed: boolean;
  message?: string;
} {
  const hourCheck = checkRateLimit(
    `ingest:hour:${userId}`,
    RATE_LIMITS.ingestion.perHour
  );
  if (!hourCheck.allowed) {
    return {
      allowed: false,
      message: "Rate limit exceeded: 50 documents per hour. Please try again later.",
    };
  }

  const dayCheck = checkRateLimit(
    `ingest:day:${userId}`,
    RATE_LIMITS.ingestion.perDay
  );
  if (!dayCheck.allowed) {
    return {
      allowed: false,
      message: "Rate limit exceeded: 200 documents per day. Please try again tomorrow.",
    };
  }

  return { allowed: true };
}

export function checkQueryRateLimit(userId: string): {
  allowed: boolean;
  message?: string;
} {
  const minuteCheck = checkRateLimit(
    `query:min:${userId}`,
    RATE_LIMITS.query.perMinute
  );
  if (!minuteCheck.allowed) {
    return {
      allowed: false,
      message: "Rate limit exceeded: 30 queries per minute. Please slow down.",
    };
  }

  const dayCheck = checkRateLimit(
    `query:day:${userId}`,
    RATE_LIMITS.query.perDay
  );
  if (!dayCheck.allowed) {
    return {
      allowed: false,
      message: "Rate limit exceeded: 500 queries per day. Please try again tomorrow.",
    };
  }

  return { allowed: true };
}
