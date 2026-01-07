/**
 * Request Debouncing and Deduplication Utilities
 * 
 * Prevents duplicate requests and implements smart debouncing.
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: never[]) => unknown>(
    func: T,
    wait: number
): {
    (...args: Parameters<T>): void;
    cancel: () => void;
    flush: () => void;
} {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;

    const debounced = (...args: Parameters<T>) => {
        lastArgs = args;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            if (lastArgs) {
                func(...(lastArgs as Parameters<T>));
            }
            timeoutId = null;
            lastArgs = null;
        }, wait);
    };

    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
            lastArgs = null;
        }
    };

    debounced.flush = () => {
        if (timeoutId && lastArgs) {
            clearTimeout(timeoutId);
            func(...(lastArgs as Parameters<T>));
            timeoutId = null;
            lastArgs = null;
        }
    };

    return debounced;
}

/**
 * Request deduplication - prevents duplicate concurrent requests
 */
export class RequestDeduplicator<T> {
    private pending = new Map<string, Promise<T>>();

    /**
     * Execute a request, deduplicating based on key
     */
    async execute(key: string, request: () => Promise<T>): Promise<T> {
        // Check if there's already a pending request with this key
        const existing = this.pending.get(key);
        if (existing) {
            return existing;
        }

        // Create new request and track it
        const promise = request().finally(() => {
            this.pending.delete(key);
        });

        this.pending.set(key, promise);
        return promise;
    }

    /**
     * Check if a request is pending
     */
    isPending(key: string): boolean {
        return this.pending.has(key);
    }

    /**
     * Clear all pending requests
     */
    clear(): void {
        this.pending.clear();
    }
}

/**
 * Throttle function - ensures func is called at most once per wait period
 */
export function throttle<T extends (...args: never[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let lastTime = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        const now = Date.now();

        if (now - lastTime >= wait) {
            lastTime = now;
            func(...(args as Parameters<T>));
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastTime = Date.now();
                func(...(args as Parameters<T>));
                timeoutId = null;
            }, wait - (now - lastTime));
        }
    };
}
