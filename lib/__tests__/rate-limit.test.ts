/**
 * Rate Limiter Tests
 * 
 * Tests for the token bucket rate limiting algorithm.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getRateLimiter, resetRateLimiter } from "@/lib/rate-limit";

describe("Rate Limiter", () => {
    beforeEach(() => {
        resetRateLimiter();
        vi.useFakeTimers();
    });

    afterEach(() => {
        resetRateLimiter();
        vi.useRealTimers();
    });

    describe("Token Bucket Algorithm", () => {
        it("should allow first request", () => {
            const limiter = getRateLimiter({ maxTokens: 10, refillRate: 1 });
            const result = limiter.check("user-1");

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(9);
        });

        it("should allow requests up to max tokens with proper spacing", () => {
            const limiter = getRateLimiter({ maxTokens: 3, refillRate: 0.1 });

            expect(limiter.check("user-1").allowed).toBe(true);
            vi.advanceTimersByTime(600); // Wait past burst protection
            expect(limiter.check("user-1").allowed).toBe(true);
            vi.advanceTimersByTime(600);
            expect(limiter.check("user-1").allowed).toBe(true);
        });

        it("should block requests after exhausting tokens", () => {
            const limiter = getRateLimiter({ maxTokens: 2, refillRate: 0.001 });

            limiter.check("user-1"); // 1 token left
            vi.advanceTimersByTime(600); // Wait past burst protection
            limiter.check("user-1"); // 0 tokens left

            // Wait past burst protection again
            vi.advanceTimersByTime(600);

            const result = limiter.check("user-1");
            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it("should refill tokens over time", () => {
            const limiter = getRateLimiter({ maxTokens: 10, refillRate: 1 });

            // Use up 5 tokens
            for (let i = 0; i < 5; i++) {
                vi.advanceTimersByTime(600); // Past burst protection
                limiter.check("user-1");
            }

            // Wait 5 seconds for tokens to refill
            vi.advanceTimersByTime(5000);

            const result = limiter.check("user-1");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeGreaterThanOrEqual(4);
        });
    });

    describe("Burst Protection", () => {
        it("should block rapid successive requests", () => {
            const limiter = getRateLimiter({ maxTokens: 10, refillRate: 1 });

            limiter.check("user-1");

            // Immediate second request should be blocked by burst protection
            const result = limiter.check("user-1");
            expect(result.allowed).toBe(false);
        });

        it("should allow requests after burst cooldown", () => {
            const limiter = getRateLimiter({ maxTokens: 10, refillRate: 1 });

            limiter.check("user-1");

            // Wait past burst protection (500ms)
            vi.advanceTimersByTime(600);

            const result = limiter.check("user-1");
            expect(result.allowed).toBe(true);
        });
    });

    describe("User Isolation", () => {
        it("should track users independently", () => {
            const limiter = getRateLimiter({ maxTokens: 2, refillRate: 0.001 });

            // User 1 uses up tokens
            limiter.check("user-1");
            vi.advanceTimersByTime(600);
            limiter.check("user-1");

            // User 2 should still have tokens (different user, no burst protection needed)
            const result = limiter.check("user-2");
            expect(result.allowed).toBe(true);
        });
    });

    describe("Reset Functionality", () => {
        it("should reset a specific user", () => {
            const limiter = getRateLimiter({ maxTokens: 2, refillRate: 0.001 });

            limiter.check("user-1");
            vi.advanceTimersByTime(600);
            limiter.check("user-1");

            limiter.reset("user-1");

            const result = limiter.check("user-1");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(1);
        });
    });

    describe("Stats", () => {
        it("should return accurate stats", () => {
            const limiter = getRateLimiter({ maxTokens: 10, refillRate: 1 });

            limiter.check("user-1");
            limiter.check("user-2");
            limiter.check("user-3");

            const stats = limiter.getStats();
            expect(stats.activeUsers).toBe(3);
            expect(stats.config.maxTokens).toBe(10);
        });
    });
});
