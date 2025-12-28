/**
 * Random Tool
 * 
 * Generate random numbers, UUIDs, passwords, and more.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolModule, ToolExecutionResult } from "./types";

export const declaration: FunctionDeclaration = {
    name: "generate_random",
    description: "Generate random numbers, UUIDs, passwords, or pick random items from a list. Use for any randomization needs.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            type: {
                type: SchemaType.STRING,
                description: "Type of random generation: number, uuid, password, choice, shuffle"
            },
            min: {
                type: SchemaType.NUMBER,
                description: "Minimum value for number generation"
            },
            max: {
                type: SchemaType.NUMBER,
                description: "Maximum value for number generation"
            },
            items: {
                type: SchemaType.STRING,
                description: "Comma-separated items for choice/shuffle operations"
            },
            length: {
                type: SchemaType.NUMBER,
                description: "Length for password generation (default: 16)"
            }
        },
        required: ["type"]
    }
};

export const handler = async (args: Record<string, unknown>): Promise<ToolExecutionResult> => {
    try {
        const type = String(args.type);

        switch (type) {
            case "number": {
                const min = Number(args.min ?? 1);
                const max = Number(args.max ?? 100);
                const result = Math.floor(Math.random() * (max - min + 1)) + min;
                return { success: true, result: { type: "number", value: result, range: { min, max } } };
            }
            case "uuid": {
                const uuid = crypto.randomUUID();
                return { success: true, result: { type: "uuid", value: uuid } };
            }
            case "password": {
                const length = Number(args.length ?? 16);
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                let password = "";
                for (let i = 0; i < length; i++) {
                    password += chars[Math.floor(Math.random() * chars.length)];
                }
                return { success: true, result: { type: "password", value: password, length } };
            }
            case "choice": {
                const items = String(args.items || "").split(",").map(s => s.trim()).filter(Boolean);
                if (items.length === 0) throw new Error("No items provided");
                const choice = items[Math.floor(Math.random() * items.length)];
                return { success: true, result: { type: "choice", value: choice, from: items } };
            }
            case "shuffle": {
                const items = String(args.items || "").split(",").map(s => s.trim()).filter(Boolean);
                const shuffled = [...items].sort(() => Math.random() - 0.5);
                return { success: true, result: { type: "shuffle", value: shuffled, original: items } };
            }
            default:
                throw new Error(`Unknown random type: ${type}`);
        }
    } catch (error) {
        return { success: false, result: null, error: error instanceof Error ? error.message : "Random generation failed" };
    }
};

const randomTool: ToolModule = { declaration, handler };
export default randomTool;
