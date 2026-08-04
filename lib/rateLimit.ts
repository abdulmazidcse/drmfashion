// A simple in-memory rate limiter
// Note: In a production serverless environment with multiple edges (Vercel), this only limits per-edge-function instance.
// For true distributed rate limiting, Upstash Redis is recommended.

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const cache = new Map<string, RateLimitEntry>();

export function rateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = cache.get(ip);

  // Clean up expired entries occasionally
  if (Math.random() < 0.1) {
    for (const [key, val] of cache.entries()) {
      if (val.resetAt < now) cache.delete(key);
    }
  }

  if (!entry || entry.resetAt < now) {
    cache.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}
