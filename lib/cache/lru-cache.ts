/**
 * High-Performance LRU Cache
 * 
 * Generic least-recently-used cache with O(1) operations.
 * Uses Map's insertion order for efficient LRU tracking.
 */

export interface LRUCacheOptions<V> {
    /** Maximum number of entries */
    maxSize: number;
    /** Time-to-live in milliseconds (optional) */
    ttl?: number;
    /** Callback when entry is evicted */
    onEvict?: (key: string, value: V) => void;
}

interface CacheEntry<V> {
    value: V;
    timestamp: number;
}

export class LRUCache<V> {
    private readonly cache = new Map<string, CacheEntry<V>>();
    private readonly maxSize: number;
    private readonly ttl: number | null;
    private readonly onEvict?: (key: string, value: V) => void;

    constructor(options: LRUCacheOptions<V>) {
        this.maxSize = options.maxSize;
        this.ttl = options.ttl ?? null;
        if (options.onEvict) {
            this.onEvict = options.onEvict;
        }
    }

    /**
     * Get value by key, returns undefined if not found or expired
     */
    get(key: string): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        // Check TTL
        if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
            this.delete(key);
            return undefined;
        }

        // Move to end (most recently used) - O(1) with Map
        this.cache.delete(key);
        this.cache.set(key, { ...entry, timestamp: Date.now() });

        return entry.value;
    }

    /**
     * Set value, evicting LRU entry if at capacity
     */
    set(key: string, value: V): void {
        // If key exists, delete first to reset position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict LRU (first entry in Map)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                const evicted = this.cache.get(firstKey);
                this.cache.delete(firstKey);
                if (evicted && this.onEvict) {
                    this.onEvict(firstKey, evicted.value);
                }
            }
        }

        this.cache.set(key, { value, timestamp: Date.now() });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Delete entry by key
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry && this.onEvict) {
            this.onEvict(key, entry.value);
        }
        return this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear(): void {
        if (this.onEvict) {
            for (const [key, entry] of this.cache) {
                this.onEvict(key, entry.value);
            }
        }
        this.cache.clear();
    }

    /**
     * Get current size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Iterate over entries (from LRU to MRU)
     */
    *entries(): IterableIterator<[string, V]> {
        for (const [key, entry] of this.cache) {
            if (!this.ttl || Date.now() - entry.timestamp <= this.ttl) {
                yield [key, entry.value];
            }
        }
    }

    /**
     * Remove expired entries
     */
    prune(): number {
        if (!this.ttl) return 0;

        const now = Date.now();
        let pruned = 0;

        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.ttl) {
                this.delete(key);
                pruned++;
            }
        }

        return pruned;
    }

    /**
     * Get cache stats
     */
    getStats(): { size: number; maxSize: number; ttl: number | null } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
        };
    }
}
