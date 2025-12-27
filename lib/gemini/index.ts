/**
 * Gemini Service Module
 * 
 * Central export point for all Gemini-related functionality.
 */

// Client
export {
    getGenAI,
    getModel,
    createGenerationConfig,
    createJsonGenerationConfig,
    resetModel,
    resetClient,
    MODEL_CONFIG
} from "./client";

// Tools
export {
    toolRegistry,
    executeTool,
    getToolDeclarations
} from "./tools";

// Prompts
export {
    SYSTEM_INSTRUCTION,
    detectIntent,
    getConfigForIntent,
    detectResponseDepth,
    getConfigForDepth,
    OUTPUT_SCHEMAS
} from "./prompts";

// Types
export type {
    ChatRequest,
    ChatResponse,
    Attachment,
    ResponseMeta,
    IntentType,
    IntentConfig,
    ResponseDepthType,
    ResponseDepthConfig,
    ToolHandler,
    ToolRegistry,
    ToolExecutionResult,
    GeminiErrorCode,
    GeminiError,
    Content,
    Part,
    FunctionCall,
    FunctionResponse
} from "./types";
