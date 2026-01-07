/**
 * High-Performance Rate Limiter
 * 
 * Token bucket algorithm with LRU cache for bounded memory.
 * For production, consider Redis-based solution.
 */

import { LRUCache } from "./cache/lru-cache";

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
    lastRequest?: number;
}

interface RateLimitConfig {
    /** Maximum tokens (requests) allowed */
    maxTokens: number;
    /** Refill rate in tokens per second */
    refillRate: number;
    /** Maximum number of users to track */
    maxUsers: number;
    /** Entry TTL in milliseconds */
    entryTtl: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxTokens: 10,
    refillRate: 0.167,       // ~10 per minute
    maxUsers: 10000,         // Bounded user tracking
    entryTtl: 5 * 60 * 1000, // 5 minute TTL
};

class RateLimiter {
    private readonly cache: LRUCache<RateLimitEntry>;
    private readonly config: RateLimitConfig;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new LRUCache<RateLimitEntry>({
            maxSize: this.config.maxUsers,
            ttl: this.config.entryTtl,
            onEvict: (key) => {
                if (process.env.NODE_ENV === "development") {
                    console.log(`[RateLimiter] Evicted entry: ${key.slice(0, 8)}...`);
                }
            },
        });
    }

    /**
     * Check if a request is allowed for the given key
     */
    check(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
        const now = Date.now();
        let entry = this.cache.get(key) as RateLimitEntry | undefined;

        if (!entry) {
            // First request - create new bucket
            entry = { tokens: this.config.maxTokens - 1, lastRefill: now, lastRequest: now };
            this.cache.set(key, entry);
            return { allowed: true, remaining: entry.tokens };
        }

        // Refill tokens
        const timePassed = (now - entry.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.config.refillRate;
        entry.tokens = Math.min(this.config.maxTokens, entry.tokens + tokensToAdd);
        entry.lastRefill = now;

        // Burst protection (500ms minimum between requests)
        const MIN_REQUEST_INTERVAL = 500;
        if (entry.lastRequest && (now - entry.lastRequest) < MIN_REQUEST_INTERVAL) {
            return { allowed: false, remaining: Math.floor(entry.tokens), retryAfter: 1 };
        }

        if (entry.tokens >= 1) {
            entry.tokens -= 1;
            entry.lastRequest = now;
            this.cache.set(key, entry); // Update in cache
            return { allowed: true, remaining: Math.floor(entry.tokens) };
        }

        // Calculate retry-after time
        const tokensNeeded = 1 - entry.tokens;
        const retryAfter = Math.ceil(tokensNeeded / this.config.refillRate);

        return { allowed: false, remaining: 0, retryAfter };
    }

    /**
     * Reset rate limit for a specific key
     */
    reset(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Get current stats
     */
    getStats() {
        const cacheStats = this.cache.getStats();
        return {
            activeUsers: cacheStats.size,
            maxUsers: cacheStats.maxSize,
            config: this.config,
        };
    }

    /**
     * Prune expired entries
     */
    prune(): number {
        return this.cache.prune();
    }

    dispose(): void {
        this.cache.clear();
    }
}

// Singleton instance
let globalRateLimiter: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
    if (!globalRateLimiter) {
        globalRateLimiter = new RateLimiter(config);
    }
    return globalRateLimiter;
}

export function resetRateLimiter(): void {
    globalRateLimiter?.dispose();
    globalRateLimiter = null;
}

