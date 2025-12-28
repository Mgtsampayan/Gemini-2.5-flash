import { getRateLimiter } from "../rate-limit";
import { getSessionCache } from "../cache/chat-cache";
import { sanitizeMessage, detectInjection } from "../sanitize";
import { AppError, RateLimitError } from "../errors";
import { GeminiAgent } from "../gemini/agent";
import {
    getModel,
    createGenerationConfig,
    MODEL_CONFIG,
    Attachment,
} from "../gemini";
import { trimHistoryByTokens } from "../tokens";
import { Content } from "@google/generative-ai";

interface ChatRequestParams {
    userId: string;
    message: string;
    attachments?: Attachment[];
    history?: Content[];
    stream?: boolean;
    responseFormat?: "text" | "json";
}

const CONFIG = {
    MAX_HISTORY_MESSAGES: 30,
    MAX_OUTPUT_TOKENS: MODEL_CONFIG.MAX_OUTPUT_TOKENS,
};

export class ChatService {
    /**
     * Trim history to predefined limits
     */
    private static trimHistory(history: Content[]): Content[] {
        if (!Array.isArray(history)) return [];

        // Limit by count
        let trimmed = history.slice(-CONFIG.MAX_HISTORY_MESSAGES);

        // Limit by tokens
        trimmed = trimHistoryByTokens(trimmed, 8000);

        return trimmed;
    }

    /**
     * Process a chat request
     */
    static async processRequest(params: ChatRequestParams): Promise<Response | object> {
        const {
            userId,
            message,
            attachments = [],
            history = [],
            stream = true,
            responseFormat = "text",
        } = params;

        // 1. Validation
        if (!userId) throw new AppError("User ID is required", 400, "INVALID_REQUEST");
        if (!message) throw new AppError("Message is required", 400, "INVALID_REQUEST");

        // 2. Rate Limiting
        const rateLimiter = getRateLimiter();
        const rateCheck = rateLimiter.check(userId);
        if (!rateCheck.allowed) {
            throw new RateLimitError(rateCheck.retryAfter || 1);
        }

        // 3. Security Checks
        if (detectInjection(message)) {
            console.warn(`[Security] Injection pattern detected from ${userId}`);
        }
        const cleanMessage = sanitizeMessage(message);

        // 4. Session Management
        const sessionCache = getSessionCache();
        let chat = sessionCache.get(userId);

        // 5. Intent Detection & Config
        const { config: generationConfig, intent, depth } = createGenerationConfig(cleanMessage);

        const finalConfig = responseFormat === "json"
            ? { ...generationConfig, responseMimeType: "application/json" }
            : generationConfig;

        // 6. Initialize Chat if needed
        if (!chat) {
            const model = getModel();
            chat = model.startChat({
                history: this.trimHistory(history),
                generationConfig: {
                    maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
                    ...finalConfig,
                },
            });
            sessionCache.set(userId, chat, history);
        }

        console.log(`[ChatService] ${userId.slice(0, 8)} | ${intent} (${depth})`);

        // 7. Execute AI
        const intentInfo = { intent, depth, config: finalConfig };

        if (stream) {
            return GeminiAgent.streamResponse(chat, cleanMessage, attachments, intentInfo);
        } else {
            const { response, meta } = await GeminiAgent.generateResponse(chat, cleanMessage, attachments, intentInfo);
            return {
                message: response,
                conversationId: userId,
                timestamp: new Date().toISOString(),
                meta,
            };
        }
    }
}
