/**
 * Calculator Tool Tests
 * 
 * Tests for the safe math expression parser.
 */

import { describe, it, expect } from "vitest";
import { handler } from "../calculate";

describe("Calculator Tool", () => {
    describe("Basic Arithmetic", () => {
        it("should add numbers", async () => {
            const result = await handler({ expression: "2 + 3" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 5 });
        });

        it("should subtract numbers", async () => {
            const result = await handler({ expression: "10 - 4" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 6 });
        });

        it("should multiply numbers", async () => {
            const result = await handler({ expression: "6 * 7" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 42 });
        });

        it("should divide numbers", async () => {
            const result = await handler({ expression: "20 / 4" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 5 });
        });

        it("should handle decimal results", async () => {
            const result = await handler({ expression: "10 / 3" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(3.333333, 5);
        });
    });

    describe("Percentages", () => {
        it("should calculate percentage of a number", async () => {
            const result = await handler({ expression: "15% of 847" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(127.05, 2);
        });

        it("should handle 'percent of' syntax", async () => {
            const result = await handler({ expression: "50 percent of 200" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 100 });
        });
    });

    describe("Exponents and Roots", () => {
        it("should calculate powers with **", async () => {
            const result = await handler({ expression: "2 ** 10" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 1024 });
        });

        it("should calculate powers with ^", async () => {
            const result = await handler({ expression: "2^10" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 1024 });
        });

        it("should calculate square roots", async () => {
            const result = await handler({ expression: "sqrt(144)" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 12 });
        });

        it("should calculate cube roots", async () => {
            const result = await handler({ expression: "cbrt(27)" });
            expect(result.success).toBe(true);
            expect(result.result).toMatchObject({ numericValue: 3 });
        });
    });

    describe("Trigonometry (Degrees)", () => {
        it("should calculate sin(45)", async () => {
            const result = await handler({ expression: "sin(45)" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(0.7071, 3);
        });

        it("should calculate cos(60)", async () => {
            const result = await handler({ expression: "cos(60)" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(0.5, 3);
        });

        it("should calculate tan(45)", async () => {
            const result = await handler({ expression: "tan(45)" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(1, 3);
        });
    });

    describe("Constants", () => {
        it("should use PI constant", async () => {
            const result = await handler({ expression: "PI" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(Math.PI, 5);
        });

        it("should use E constant", async () => {
            const result = await handler({ expression: "E" });
            expect(result.success).toBe(true);
            expect((result.result as { numericValue: number }).numericValue).toBeCloseTo(Math.E, 5);
        });
    });

    describe("Error Handling", () => {
        it("should fail on empty expression", async () => {
            const result = await handler({ expression: "" });
            expect(result.success).toBe(false);
            expect(result.error).toContain("Empty expression");
        });

        it("should fail on division by zero", async () => {
            const result = await handler({ expression: "1/0" });
            expect(result.success).toBe(false);
            expect(result.error).toContain("invalid number");
        });

        it("should fail on invalid syntax", async () => {
            const result = await handler({ expression: "2 * * 3" });
            expect(result.success).toBe(false);
        });

        it("should fail on undefined variable", async () => {
            const result = await handler({ expression: "xyz + 5" });
            expect(result.success).toBe(false);
        });
    });
});
