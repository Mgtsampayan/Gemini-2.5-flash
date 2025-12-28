/**
 * Tool Type Definitions
 * 
 * Shared types for all tool modules.
 */

import type { FunctionDeclaration } from "@google/generative-ai";

export interface ToolExecutionResult {
    success: boolean;
    result: unknown;
    error?: string | undefined;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolExecutionResult>;

export interface ToolModule {
    declaration: FunctionDeclaration;
    handler: ToolHandler;
}
