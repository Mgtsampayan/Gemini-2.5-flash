/**
 * Tool Registry
 * 
 * Central registry for all Gemini function calling tools.
 * Tools are loaded from individual modules for better maintainability.
 */

import type { FunctionDeclaration } from "@google/generative-ai";
import type { ToolHandler, ToolExecutionResult, ToolModule } from "./types";

// Import individual tools
import calculateTool from "./calculate";
import datetimeTool from "./datetime";
import randomTool from "./random";
import convertTool from "./convert";
import analyzeTool from "./analyze";
import encodeTool from "./encode";

// Re-export types
export type { ToolHandler, ToolExecutionResult, ToolModule } from "./types";

// ============================================================================
// Tool Registry
// ============================================================================

const tools: ToolModule[] = [
    calculateTool,
    datetimeTool,
    randomTool,
    convertTool,
    analyzeTool,
    encodeTool
];

// Build declarations array
const toolDefinitions: FunctionDeclaration[] = tools.map(t => t.declaration);

// Build handlers map
const handlers: Record<string, ToolHandler> = {};
for (const tool of tools) {
    handlers[tool.declaration.name] = tool.handler;
}

export interface ToolRegistry {
    definitions: FunctionDeclaration[];
    handlers: Record<string, ToolHandler>;
}

export const toolRegistry: ToolRegistry = {
    definitions: toolDefinitions,
    handlers
};

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(
    toolName: string,
    args: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const handler = handlers[toolName];

    if (!handler) {
        return {
            success: false,
            result: null,
            error: `Unknown tool: ${toolName}`
        };
    }

    console.log(`[Tool] Executing: ${toolName}`, args);
    const startTime = Date.now();

    const result = await handler(args);

    console.log(`[Tool] ${toolName} completed in ${Date.now() - startTime}ms`,
        result.success ? "✓" : "✗");

    return result;
}

/**
 * Get tool definitions in Gemini SDK format
 */
export function getToolDeclarations() {
    return {
        functionDeclarations: toolDefinitions
    };
}
