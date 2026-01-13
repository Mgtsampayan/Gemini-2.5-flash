import { GoogleGenerativeAI, type GenerativeModel, type GenerationConfig } from "@google/generative-ai";
import { getToolDeclarations } from "./tools";
import { SYSTEM_INSTRUCTION, detectIntent, getConfigForIntent, detectResponseDepth, getConfigForDepth } from "./prompts";
import type { IntentType, ResponseDepthType } from "./types";

export const MODEL_CONFIG = {
    MODEL_NAME: "gemini-3-flash-preview",
    MAX_OUTPUT_TOKENS: 8192,
    REQUEST_TIMEOUT: 90_000,

    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_TOP_P: 0.95,
    DEFAULT_TOP_K: 40,
} as const;

let genAIInstance: GoogleGenerativeAI | null = null;
let modelInstance: GenerativeModel | null = null;

export function getGenAI(): GoogleGenerativeAI {
    if (genAIInstance) return genAIInstance;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    genAIInstance = new GoogleGenerativeAI(apiKey);
    return genAIInstance;
}

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

export function createGenerationConfig(
    message: string,
    overrides?: Partial<GenerationConfig>
): { config: GenerationConfig; intent: IntentType; depth: ResponseDepthType } {
    const intent = detectIntent(message);
    const intentConfig = getConfigForIntent(intent);

    const depth = detectResponseDepth(message);
    const depthConfig = getConfigForDepth(depth);

    console.log(`[Intent] Detected: ${intent} (${intentConfig.description})`);
    console.log(`[Depth] Detected: ${depth} (${depthConfig.description}) → maxTokens: ${depthConfig.maxOutputTokens}`);

    const config: GenerationConfig = {
        temperature: overrides?.temperature ?? intentConfig.temperature,
        topP: overrides?.topP ?? intentConfig.topP,
        topK: overrides?.topK ?? intentConfig.topK,
        // Use depth-based maxOutputTokens unless overridden
        maxOutputTokens: overrides?.maxOutputTokens ?? depthConfig.maxOutputTokens,
    };

    return { config, intent, depth };
}

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

export function resetModel(): void {
    modelInstance = null;
}

export function resetClient(): void {
    genAIInstance = null;
    modelInstance = null;
}
