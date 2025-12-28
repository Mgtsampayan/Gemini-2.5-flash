/**
 * Calculate Tool
 * 
 * Safe mathematical expression evaluation using expr-eval.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { Parser } from "expr-eval";
import type { ToolModule, ToolExecutionResult } from "./types";

export const declaration: FunctionDeclaration = {
    name: "calculate",
    description: "Perform mathematical calculations. Supports basic arithmetic, percentages, exponents, square roots, trigonometry (sin, cos, tan), logarithms, and more. Use this for ANY math calculation to ensure accuracy.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            expression: {
                type: SchemaType.STRING,
                description: "The mathematical expression to evaluate, e.g., '15% of 847', '2^10', 'sqrt(144)', 'sin(45)', 'log(100)'"
            }
        },
        required: ["expression"]
    }
};

export const handler = async (args: Record<string, unknown>): Promise<ToolExecutionResult> => {
    try {
        const expression = String(args.expression || "").trim();

        if (!expression) {
            throw new Error("Empty expression provided");
        }

        // Normalize expression for the parser
        let normalized = expression
            // Handle natural language patterns
            .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, "($1/100)*$2")
            .replace(/(\d+(?:\.\d+)?)\s*percent\s*of\s*(\d+(?:\.\d+)?)/gi, "($1/100)*$2")
            // Replace ** with ^ for exponentiation (expr-eval uses ^ not **)
            .replace(/\*\*/g, "^")
            // Handle common function name aliases
            .replace(/\bln\b/g, "log")
            .replace(/\blog10\b/g, "log10")
            // Convert trig functions to use radians (expr-eval uses radians)
            // sin(x) -> sin(x * PI / 180) for degree input
            .replace(/\bsin\s*\(\s*([^)]+)\s*\)/gi, "sin(($1) * PI / 180)")
            .replace(/\bcos\s*\(\s*([^)]+)\s*\)/gi, "cos(($1) * PI / 180)")
            .replace(/\btan\s*\(\s*([^)]+)\s*\)/gi, "tan(($1) * PI / 180)");

        // Create parser
        const parser = new Parser();

        // Parse and evaluate safely (no code execution possible)
        const parsedExpr = parser.parse(normalized);
        const result = parsedExpr.evaluate({
            PI: Math.PI,
            E: Math.E,
            pi: Math.PI,
            e: Math.E
        });

        if (typeof result !== "number" || !isFinite(result)) {
            throw new Error("Calculation resulted in invalid number");
        }

        // Format result nicely
        const formatted = Number.isInteger(result)
            ? result.toString()
            : result.toFixed(10).replace(/\.?0+$/, "");

        return {
            success: true,
            result: {
                expression: args.expression,
                result: formatted,
                numericValue: result
            }
        };
    } catch (error) {
        return {
            success: false,
            result: null,
            error: `Calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        };
    }
};

const calculateTool: ToolModule = { declaration, handler };
export default calculateTool;
