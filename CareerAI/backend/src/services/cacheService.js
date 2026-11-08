const Redis = require('ioredis');
const env = require('../config/env');

class CacheService {
  constructor() {
    this.isRedisReady = false;
    this.redisClient = null;
    this.memoryCache = new Map();
    this.init();
  }

  init() {
    // If REDIS_URL or explicit REDIS_HOST provided, try connecting to Redis
    const hasRedisConfig = Boolean(env.REDIS_URL || (process.env.REDIS_URL || process.env.REDIS_HOST));
    
    if (hasRedisConfig) {
      try {
        const redisOptions = {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => {
            if (times > 3) {
              console.warn('[Cache] Redis connection failed after 3 attempts. Falling back to in-memory caching.');
              return null; // Stop retrying and stay on memory fallback
            }
            return Math.min(times * 100, 1000);
          },
          connectTimeout: 3000
        };

        if (env.REDIS_URL) {
          this.redisClient = new Redis(env.REDIS_URL, redisOptions);
        } else if (process.env.REDIS_HOST) {
          this.redisClient = new Redis({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD || undefined,
            ...redisOptions
          });
        }

        if (this.redisClient) {
          this.redisClient.connect().then(() => {
            this.isRedisReady = true;
            console.log('[Cache] Redis connected successfully. Multi-layer caching active.');
          }).catch((err) => {
            console.warn('[Cache] Redis initial connect notice:', err.message, '- Using high-performance in-memory fallback.');
            this.isRedisReady = false;
          });

          this.redisClient.on('error', (err) => {
            if (this.isRedisReady) {
              console.warn('[Cache] Redis runtime notice:', err.message);
              this.isRedisReady = false;
            }
          });

          this.redisClient.on('ready', () => {
            this.isRedisReady = true;
          });
        }
      } catch (err) {
        console.warn('[Cache] Redis setup notice:', err.message);
        this.isRedisReady = false;
      }
    } else {
      console.log('[Cache] In-memory high-throughput cache active (Redis optional via REDIS_URL).');
    }

    // Periodic sweep for expired keys in memory cache (every 60 seconds)
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expiresAt && item.expiresAt <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000).unref();
  }

  async get(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        // Fall back to memory on error
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, serialized);
        }
        return;
      } catch (err) {
        // Fall back to memory on error
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null
    });
  }

  async del(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {}
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err) {}
    }

    // Convert glob pattern to regex for in-memory cache
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Invalidate all cached data for a specific user
  async invalidateUser(userId) {
    if (!userId) return;
    await this.delPattern(`user:${userId}:*`);
  }

  // Middleware generator for express routes
  middleware({ ttl = 300, keyGenerator = null, isPublic = false } = {}) {
    return async (req, res, next) => {
      // Only cache GET and HEAD requests
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }

      // Generate cache key
      let cacheKey;
      if (typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        const userId = req.user?.firebaseUid || req.collegeAdmin?.id || 'anon';
        cacheKey = `route:${req.baseUrl}${req.path}:${userId}:${JSON.stringify(req.query)}`;
      }

      if (!cacheKey) {
        return next();
      }

      try {
        const cached = await this.get(cacheKey);
        if (cached !== null && cached !== undefined) {
          // Set appropriate cache-control headers
          if (isPublic) {
            res.setHeader('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`);
          } else {
            res.setHeader('Cache-Control', 'private, no-cache');
          }
          res.setHeader('X-Cache-Status', 'HIT');
          return res.json(cached);
        }

        // Intercept response to store in cache
        const originalJson = res.json.bind(res);
        res.json = (body) => {
          // Only cache successful 200 responses
          if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
            this.set(cacheKey, body, ttl).catch(() => {});
          }

          if (isPublic) {
            res.setHeader('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`);
          } else {
            res.setHeader('Cache-Control', 'private, no-cache');
          }
          res.setHeader('X-Cache-Status', 'MISS');
          return originalJson(body);
        };

        next();
      } catch (err) {
        next();
      }
    };
  }
}

module.exports = new CacheService();

