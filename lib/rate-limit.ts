/**
 * Simple In-Memory Rate Limiter
 * 
 * Token bucket algorithm for rate limiting API requests.
 * For production, consider Redis-based solution.
 */

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
    lastRequest?: number; // timestamp of last successful request
}

interface RateLimitConfig {
    /** Maximum tokens (requests) allowed */
    maxTokens: number;
    /** Refill rate in tokens per second */
    refillRate: number;
    /** Time window in milliseconds for cleanup */
    cleanupInterval: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxTokens: 10,           // 10 requests
    refillRate: 0.167,       // ~10 per minute (10/60)
    cleanupInterval: 60_000, // Clean up every minute
};

class RateLimiter {
    private readonly buckets = new Map<string, RateLimitEntry>();
    private readonly config: RateLimitConfig;
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startCleanup();
    }

    /**
     * Check if a request is allowed for the given key
     * @returns Object with allowed status and remaining tokens
     */
    check(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
        const now = Date.now();
        let entry = this.buckets.get(key);

        if (!entry) {
            // First request - create new bucket with max tokens minus 1
            entry = { tokens: this.config.maxTokens - 1, lastRefill: now, lastRequest: now };
            this.buckets.set(key, entry);
            return { allowed: true, remaining: entry.tokens };
        }

        // Refill tokens
        const timePassed = (now - entry.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.config.refillRate;
        entry.tokens = Math.min(this.config.maxTokens, entry.tokens + tokensToAdd);
        entry.lastRefill = now;

        // BURST PROTECTION
        // Prevent requests if they are too close together (< 500ms)
        // This is a separate check from the token bucket
        const MIN_REQUEST_INTERVAL = 500; // ms
        if (entry.lastRequest && (now - entry.lastRequest) < MIN_REQUEST_INTERVAL) {
            return { allowed: false, remaining: Math.floor(entry.tokens), retryAfter: 1 };
        }

        if (entry.tokens >= 1) {
            entry.tokens -= 1;
            entry.lastRequest = now; // Update last request time
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
        this.buckets.delete(key);
    }

    /**
     * Get current stats
     */
    getStats() {
        return {
            activeUsers: this.buckets.size,
            config: this.config,
        };
    }

    /**
     * Clean up old entries
     */
    private cleanup(): void {
        const now = Date.now();
        const staleThreshold = 5 * 60 * 1000; // 5 minutes

        for (const [key, entry] of this.buckets) {
            if (now - entry.lastRefill > staleThreshold) {
                this.buckets.delete(key);
            }
        }
    }

    private startCleanup(): void {
        this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
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
