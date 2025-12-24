/**
 * Gemini Client Factory
 * 
 * Centralized initialization and configuration of Gemini SDK.
 */

import { GoogleGenerativeAI, type GenerativeModel, type GenerationConfig } from "@google/generative-ai";
import { getToolDeclarations } from "./tools";
import { SYSTEM_INSTRUCTION, detectIntent, getConfigForIntent } from "./prompts";
import type { IntentType } from "./types";

// ============================================================================
// Configuration
// ============================================================================

export const MODEL_CONFIG = {
    MODEL_NAME: "gemini-3-flash-preview",
    MAX_OUTPUT_TOKENS: 8192,
    REQUEST_TIMEOUT: 90_000,

    // Default generation config (overridden by intent detection)
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_TOP_P: 0.95,
    DEFAULT_TOP_K: 40,
} as const;

// ============================================================================
// Singleton Client
// ============================================================================

let genAIInstance: GoogleGenerativeAI | null = null;
let modelInstance: GenerativeModel | null = null;

/**
 * Get or create the Gemini API client
 */
export function getGenAI(): GoogleGenerativeAI {
    if (genAIInstance) return genAIInstance;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    genAIInstance = new GoogleGenerativeAI(apiKey);
    return genAIInstance;
}

/**
 * Get the configured Gemini model with tools enabled
 */
export function getModel(): GenerativeModel {
    if (modelInstance) return modelInstance;

    const genAI = getGenAI();

    modelInstance = genAI.getGenerativeModel({
        model: MODEL_CONFIG.MODEL_NAME,
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [getToolDeclarations()],
        generationConfig: {
            temperature: MODEL_CONFIG.DEFAULT_TEMPERATURE,
            topP: MODEL_CONFIG.DEFAULT_TOP_P,
            topK: MODEL_CONFIG.DEFAULT_TOP_K,
            maxOutputTokens: MODEL_CONFIG.MAX_OUTPUT_TOKENS,
        },
    });

    return modelInstance;
}

/**
 * Create a generation config based on message intent
 */
export function createGenerationConfig(
    message: string,
    overrides?: Partial<GenerationConfig>
): { config: GenerationConfig; intent: IntentType } {
    const intent = detectIntent(message);
    const intentConfig = getConfigForIntent(intent);

    console.log(`[Intent] Detected: ${intent} (${intentConfig.description})`);

    const config: GenerationConfig = {
        temperature: overrides?.temperature ?? intentConfig.temperature,
        topP: overrides?.topP ?? intentConfig.topP,
        topK: overrides?.topK ?? intentConfig.topK,
        maxOutputTokens: overrides?.maxOutputTokens ?? MODEL_CONFIG.MAX_OUTPUT_TOKENS,
    };

    return { config, intent };
}

/**
 * Create a generation config for JSON output mode
 */
export function createJsonGenerationConfig(
    message: string,
    schema?: object
): GenerationConfig {
    const { config } = createGenerationConfig(message);

    return {
        ...config,
        responseMimeType: "application/json",
        ...(schema && { responseSchema: schema }),
    };
}

/**
 * Reset model instance (for testing or config changes)
 */
export function resetModel(): void {
    modelInstance = null;
}

/**
 * Reset all instances
 */
export function resetClient(): void {
    genAIInstance = null;
    modelInstance = null;
}
