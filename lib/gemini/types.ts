/**
 * Gemini Service Types
 * 
 * Type-safe interfaces for Gemini 3 Flash API interactions.
 * Uses SDK types where possible for consistency.
 */

import type { Content, Part, FunctionCall, FunctionResponse, FunctionDeclaration } from "@google/generative-ai";
export { SchemaType } from "@google/generative-ai";

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ChatRequest {
    message: string;
    userId: string;
    stream?: boolean;
    history?: Content[];
    /** File attachments for multimodal input */
    attachments?: Attachment[];
    /** Request structured JSON output */
    responseFormat?: "text" | "json";
    /** Override default temperature (0.0-2.0) */
    temperature?: number;
}

export interface Attachment {
    /** MIME type: image/png, image/jpeg, image/webp, application/pdf, audio/*, video/* */
    mimeType: string;
    /** Base64-encoded file data */
    data: string;
    /** Optional filename for display */
    filename?: string;
}

export interface ChatResponse {
    message: string;
    conversationId: string;
    timestamp: string;
    meta: ResponseMeta;
}

export interface ResponseMeta {
    processingTimeMs: number;
    estimatedTokens: number;
    /** Intent detected from user message */
    detectedIntent?: IntentType | undefined;
    /** Response depth detected from user message */
    detectedDepth?: ResponseDepthType | undefined;
    /** Temperature used for this response */
    temperatureUsed?: number | undefined;
    /** Max output tokens used based on depth */
    maxTokensUsed?: number | undefined;
    /** Tools that were called during generation */
    toolsUsed?: string[] | undefined;
    /** Whether response came from cache */
    cached?: boolean | undefined;
}

// ============================================================================
// Intent Detection
// ============================================================================

export type IntentType =
    | "math"        // Mathematical calculations, equations
    | "code"        // Programming, debugging, code review
    | "creative"    // Writing, stories, poems, brainstorming
    | "factual"     // Facts, definitions, explanations
    | "analysis"    // Data analysis, comparisons
    | "general";    // General conversation

export interface IntentConfig {
    temperature: number;
    topP: number;
    topK: number;
    description: string;
}

export const INTENT_CONFIGS: Record<IntentType, IntentConfig> = {
    math: {
        temperature: 0.1,
        topP: 0.8,
        topK: 20,
        description: "Precise mathematical calculations"
    },
    code: {
        temperature: 0.2,
        topP: 0.85,
        topK: 30,
        description: "Code generation and debugging"
    },
    factual: {
        temperature: 0.3,
        topP: 0.9,
        topK: 35,
        description: "Factual information retrieval"
    },
    analysis: {
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        description: "Data analysis and comparisons"
    },
    general: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        description: "General conversation"
    },
    creative: {
        temperature: 0.9,
        topP: 0.98,
        topK: 50,
        description: "Creative writing and brainstorming"
    }
};

// ============================================================================
// Response Depth Detection
// ============================================================================

/**
 * Response depth determines how detailed the AI's response should be.
 * - brief: 1-3 sentences for simple questions, greetings, yes/no, direct facts
 * - standard: 1-2 paragraphs for typical questions
 * - comprehensive: Multi-section responses for complex explanations, tutorials, comparisons
 */
export type ResponseDepthType =
    | "brief"           // Quick answers: greetings, simple facts, yes/no
    | "standard"        // Medium detail: typical questions  
    | "comprehensive";  // In-depth: tutorials, comparisons, detailed explanations

export interface ResponseDepthConfig {
    maxOutputTokens: number;
    description: string;
    /** Hint for the AI on response structure */
    structureHint: string;
}

export const RESPONSE_DEPTH_CONFIGS: Record<ResponseDepthType, ResponseDepthConfig> = {
    brief: {
        maxOutputTokens: 256,
        description: "Quick, concise response",
        structureHint: "1-3 sentences, direct answer"
    },
    standard: {
        maxOutputTokens: 1024,
        description: "Standard detailed response",
        structureHint: "1-2 paragraphs with explanation"
    },
    comprehensive: {
        maxOutputTokens: 4096,
        description: "In-depth comprehensive response",
        structureHint: "Multiple sections, examples, thorough coverage"
    }
};

// ============================================================================
// Tool/Function Calling Types
// ============================================================================

// ToolDefinition removed - using FunctionDeclaration from SDK directly

export interface ToolExecutionResult {
    success: boolean;
    result: unknown;
    error?: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolExecutionResult>;

export interface ToolRegistry {
    definitions: FunctionDeclaration[];
    handlers: Record<string, ToolHandler>;
}

// Re-export SDK types for convenience
export type { Content, Part, FunctionCall, FunctionResponse };

// ============================================================================
// Error Types
// ============================================================================

export type GeminiErrorCode =
    | "RATE_LIMITED"
    | "SAFETY_BLOCKED"
    | "QUOTA_EXCEEDED"
    | "INVALID_REQUEST"
    | "TIMEOUT"
    | "INTERNAL_ERROR"
    | "TOOL_EXECUTION_FAILED";

export interface GeminiError {
    code: GeminiErrorCode;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
}
