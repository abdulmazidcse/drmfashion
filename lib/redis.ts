import Redis from "ioredis"

// ─── Redis Singleton ──────────────────────────────────────────────────────────
// Prevents multiple connections during Next.js hot-reload in development.
// Set REDIS_URL in .env:
//   Local:      redis://localhost:6379
//   Production: redis://:<password>@<host>:6379
// ─────────────────────────────────────────────────────────────────────────────

const globalForRedis = globalThis as { redis?: Redis }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379"

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    enableOfflineQueue: true,
    lazyConnect: false,
    retryStrategy(times) {
      if (times > 5) {
        return null; // Stop retrying after 5 attempts
      }
      return 5000; // Retry every 5 seconds
    }
  })

  client.on("connect", () => console.log("✅ Redis connected"))
  let hasLoggedError = false;
  client.on("error", (err) => {
    // Don't crash the app if Redis is unavailable — just log once
    if (process.env.NODE_ENV !== "test" && !hasLoggedError) {
      console.warn("⚠️  Redis error (cache disabled):", err.message)
      hasLoggedError = true;
    }
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

// ─── Cache Helpers ───────────────────────────────────────────────────────────

/**
 * Get data from Redis cache.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (redis.status !== "ready") return null;
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    // console.error(`Redis GET error for key ${key}:`, error)
    return null
  }
}

/**
 * Set data in Redis cache with an expiration time.
 * @param key Cache key
 * @param data Data to cache
 * @param ttlSeconds Time to live in seconds (default 300s = 5m)
 */
export async function setCache(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
  try {
    if (redis.status !== "ready") return;
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    // console.error(`Redis SET error for key ${key}:`, error)
  }
}

/**
 * Invalidate a specific cache key.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    if (redis.status !== "ready") return;
    await redis.del(key)
  } catch (error) {
    // console.error(`Redis DEL error for key ${key}:`, error)
  }
}

/**
 * Retrieve data from cache or fetch and cache it if not present.
 */
export async function fetchWithCache<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) return cached

  const freshData = await fetchFn()
  await setCache(key, freshData, ttlSeconds)
  return freshData
}
