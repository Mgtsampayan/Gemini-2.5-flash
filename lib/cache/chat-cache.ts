/**
 * Enterprise Chat Session Cache Management
 * 
 * Provides enterprise-grade session caching with:
 * - Automatic session expiration
 * - Memory-efficient LRU eviction
 * - Type-safe session handling
 */

import type { ChatSession, Content } from "@google/generative-ai";

interface CachedSession {
    session: ChatSession;
    lastAccessed: number;
    createdAt: number;
    messageCount: number;
    history: Content[];
}

interface CacheConfig {
    /** Maximum time in ms before session expires (default: 30 minutes) */
    sessionTimeout: number;
    /** Maximum number of sessions to cache (default: 1000) */
    maxSessions: number;
    /** Interval in ms for cleanup task (default: 5 minutes) */
    cleanupInterval: number;
}

const DEFAULT_CONFIG: CacheConfig = {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxSessions: 1000,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
};

/**
 * Enterprise session cache with automatic cleanup and LRU eviction
 */
export class SessionCache {
    private readonly sessions = new Map<string, CachedSession>();
    private readonly config: CacheConfig;
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startCleanupTask();
    }

    /**
     * Get a session by user ID
     */
    get(userId: string): ChatSession | null {
        const cached = this.sessions.get(userId);

        if (!cached) {
            return null;
        }

        // Check if session has expired
        if (Date.now() - cached.lastAccessed > this.config.sessionTimeout) {
            this.sessions.delete(userId);
            return null;
        }

        // Update last accessed time
        cached.lastAccessed = Date.now();
        return cached.session;
    }

    /**
     * Get full session data including history
     */
    getSessionData(userId: string): CachedSession | null {
        const cached = this.sessions.get(userId);
        if (!cached) return null;

        if (Date.now() - cached.lastAccessed > this.config.sessionTimeout) {
            this.sessions.delete(userId);
            return null;
        }

        cached.lastAccessed = Date.now();
        return cached;
    }

    /**
     * Store a session for a user
     */
    set(userId: string, session: ChatSession, initialHistory: Content[] = []): void {
        // Evict oldest sessions if at capacity
        if (this.sessions.size >= this.config.maxSessions) {
            this.evictOldest();
        }

        const now = Date.now();
        this.sessions.set(userId, {
            session,
            history: initialHistory,
            lastAccessed: now,
            createdAt: now,
            messageCount: initialHistory.length,
        });
    }

    /**
     * Update message count for a session
     */
    incrementMessageCount(userId: string): void {
        const cached = this.sessions.get(userId);
        if (cached) {
            cached.messageCount++;
            cached.lastAccessed = Date.now();
        }
    }

    /**
     * Update history for a session
     */
    updateHistory(userId: string, history: Content[]): void {
        const cached = this.sessions.get(userId);
        if (cached) {
            cached.history = history;
            cached.lastAccessed = Date.now();
        }
    }

    /**
     * Delete a specific session
     */
    delete(userId: string): boolean {
        return this.sessions.delete(userId);
    }

    /**
     * Check if a session exists
     */
    has(userId: string): boolean {
        const session = this.get(userId);
        return session !== null;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            activeSessions: this.sessions.size,
            maxSessions: this.config.maxSessions,
            sessionTimeout: this.config.sessionTimeout,
        };
    }

    /**
     * Clear all sessions
     */
    clear(): void {
        this.sessions.clear();
    }

    /**
     * Stop the cleanup task (for testing/shutdown)
     */
    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Remove expired sessions
     */
    private cleanup(): void {
        const now = Date.now();
        const expiredIds: string[] = [];

        for (const [userId, cached] of this.sessions) {
            if (now - cached.lastAccessed > this.config.sessionTimeout) {
                expiredIds.push(userId);
            }
        }

        for (const id of expiredIds) {
            this.sessions.delete(id);
        }

        if (expiredIds.length > 0) {
            console.log(`[SessionCache] Cleaned up ${expiredIds.length} expired sessions`);
        }
    }

    /**
     * Evict the oldest session (LRU)
     */
    private evictOldest(): void {
        let oldestId: string | null = null;
        let oldestTime = Date.now();

        for (const [userId, cached] of this.sessions) {
            if (cached.lastAccessed < oldestTime) {
                oldestTime = cached.lastAccessed;
                oldestId = userId;
            }
        }

        if (oldestId) {
            this.sessions.delete(oldestId);
            console.log(`[SessionCache] Evicted oldest session: ${oldestId}`);
        }
    }

    /**
     * Start periodic cleanup task
     */
    private startCleanupTask(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);

        // Ensure cleanup doesn't prevent Node from exiting
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }
}

// Singleton instance for application-wide session management
let globalCache: SessionCache | null = null;

/**
 * Get the global session cache instance
 */
export function getSessionCache(config?: Partial<CacheConfig>): SessionCache {
    if (!globalCache) {
        globalCache = new SessionCache(config);
    }
    return globalCache;
}

/**
 * Reset the global cache (for testing)
 */
export function resetSessionCache(): void {
    globalCache?.dispose();
    globalCache = null;
}
