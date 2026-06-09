import { Redis } from "@upstash/redis";

let redis: Redis | null = null

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN")
  }

  redis ??= new Redis({ url, token })
  return redis
}

export async function getCached<T>(key: string): Promise<T | null> {
  return getRedisClient().get<T>(key);
}

export async function setCache(key: string, value: unknown, ttlSeconds = 300) {
  await getRedisClient().set(key, value, { ex: ttlSeconds });
}
