/**
 * Chat API Route Handler (Simplified)
 *
 * A clean, minimal implementation for easy debugging.
 * - Streaming via SSE
 * - Basic rate limiting
 * - Simple input sanitization
 */

import { NextResponse } from "next/server";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { getSessionCache } from "@/lib/cache/chat-cache";
import { sanitizeMessage, detectInjection } from "@/lib/sanitize";
import { getRateLimiter } from "@/lib/rate-limit";
import { trimHistoryByTokens, estimateTokens } from "@/lib/tokens";

// ============================================================================
// Error Handling
// ============================================================================

class AppError extends Error {
    constructor(public message: string, public statusCode: number = 500) {
        super(message);
        this.name = "AppError";
    }
}

class RateLimitError extends AppError {
    constructor(retryAfter: number) {
        super(`Too many requests. Please wait ${retryAfter}s.`, 429);
        this.name = "RateLimitError";
    }
}

function handleError(error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    const status = error instanceof AppError ? error.statusCode : 500;
    console.error(`[API Error]`, message);
    return NextResponse.json({ error: message }, { status });
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    MODEL_NAME: "gemini-2.5-flash",
    MAX_OUTPUT_TOKENS: 4096,
    MAX_HISTORY_MESSAGES: 20,
    REQUEST_TIMEOUT: 60_000,
    SYSTEM_INSTRUCTION: `You are GemBot, an expert coding assistant.

## How to Respond
- Be direct and concise — skip unnecessary preamble
- Use markdown formatting for all code
- Explain complex parts briefly, then show the code
- If a question is unclear, ask for clarification

## Code Standards
- TypeScript: Use strict types, avoid \`any\`
- React: Functional components with hooks
- Always handle errors and edge cases

## What NOT to Do
- Don't apologize excessively
- Don't repeat the question back
- Don't add code you weren't asked for`,
} as const;

// ============================================================================
// Service Setup
// ============================================================================

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
const sessionCache = getSessionCache();

function getAIModel(): GenerativeModel {
    if (model) return model;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new AppError("Missing GOOGLE_API_KEY", 500);
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: CONFIG.MODEL_NAME,
        systemInstruction: CONFIG.SYSTEM_INSTRUCTION,
    });

    return model;
}

// ============================================================================
// History Management (Token-Aware)
// ============================================================================

type HistoryMessage = { role: string; parts: Array<{ text: string }> };

function trimHistory(history: HistoryMessage[]): HistoryMessage[] {
    if (!Array.isArray(history)) return [];

    // First: limit by message count (fast)
    let trimmed = history.slice(-CONFIG.MAX_HISTORY_MESSAGES);

    // Second: limit by tokens (prevents overflow)
    trimmed = trimHistoryByTokens(trimmed, 8000);

    return trimmed;
}

// ============================================================================
// Streaming Handler
// ============================================================================

async function streamResponse(
    userId: string,
    message: string,
    history: HistoryMessage[] = []
): Promise<Response> {
    const aiModel = getAIModel();
    const encoder = new TextEncoder();

    let chat = sessionCache.get(userId);

    if (!chat) {
        chat = aiModel.startChat({
            history: trimHistory(history),
            generationConfig: { maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS },
        });
        sessionCache.set(userId, chat, history);
    }

    const stream = new ReadableStream({
        async start(controller) {
            const startTime = Date.now();
            let fullText = "";

            try {
                const result = await chat!.sendMessageStream(message);

                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        fullText += text;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                        );
                    }
                }

                // Send metadata at end
                const meta = {
                    processingTimeMs: Date.now() - startTime,
                    estimatedTokens: estimateTokens(fullText),
                };
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ done: true, meta })}\n\n`)
                );
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));

            } catch (error) {
                const msg = error instanceof Error ? error.message : "Stream error";
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
                );
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

// ============================================================================
// Non-Streaming Handler
// ============================================================================

async function sendMessage(
    userId: string,
    message: string,
    history: HistoryMessage[] = []
): Promise<string> {
    const aiModel = getAIModel();

    let chat = sessionCache.get(userId);

    if (!chat) {
        chat = aiModel.startChat({
            history: trimHistory(history),
            generationConfig: { maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS },
        });
        sessionCache.set(userId, chat, history);
    }

    const result = await chat.sendMessage(message);
    return result.response.text();
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request) {
    try {
        // Validate content type
        if (!request.headers.get("content-type")?.includes("application/json")) {
            throw new AppError("Content-Type must be application/json", 415);
        }

        // Parse body
        const body = await request.json().catch(() => {
            throw new AppError("Invalid JSON", 400);
        });

        // Extract fields
        const message = typeof body.message === "string" ? body.message.trim() : "";
        const userId = typeof body.userId === "string" ? body.userId.trim() : "";
        const stream = body.stream !== false;
        const history = Array.isArray(body.history) ? body.history : [];

        if (!message) throw new AppError("Message is required", 400);
        if (!userId) throw new AppError("User ID is required", 400);

        // Rate limiting
        const rateLimiter = getRateLimiter();
        const rateCheck = rateLimiter.check(userId);
        if (!rateCheck.allowed) {
            throw new RateLimitError(rateCheck.retryAfter || 1);
        }

        // Security: Log if suspicious patterns detected
        if (detectInjection(message)) {
            console.warn(`[Security] Injection pattern detected from ${userId}`);
        }

        // Sanitize input
        const cleanMessage = sanitizeMessage(message);

        // Handle request
        const startTime = Date.now();

        if (stream) {
            return streamResponse(userId, cleanMessage, history);
        }

        const response = await sendMessage(userId, cleanMessage, history);
        return NextResponse.json({
            message: response,
            conversationId: userId,
            timestamp: new Date().toISOString(),
            meta: {
                processingTimeMs: Date.now() - startTime,
                estimatedTokens: estimateTokens(response),
            },
        });

    } catch (error) {
        return handleError(error);
    }
}
