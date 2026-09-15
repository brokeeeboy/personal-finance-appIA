interface Bucket {
  count: number;
  resetAt: number;
}

// Limitador en memoria: alcanza para un solo proceso Node como el que arma
// docker-compose.yml en este proyecto. Si algún día se corre en múltiples
// instancias detrás de un balanceador, esto habría que moverlo a algo
// compartido (Redis, la propia base de datos, etc.) porque cada instancia
// tendría su propio contador.
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}
