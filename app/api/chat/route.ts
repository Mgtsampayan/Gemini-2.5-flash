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
    MODEL_NAME: "gemini-3-flash-preview",
    MAX_OUTPUT_TOKENS: 8192,
    MAX_HISTORY_MESSAGES: 30,
    REQUEST_TIMEOUT: 90_000,

    // Generation parameters for higher quality responses
    TEMPERATURE: 0.7,          // Balance creativity and accuracy (0.0-2.0)
    TOP_P: 0.95,               // Nucleus sampling for diverse yet relevant responses
    TOP_K: 40,                 // Consider top 40 tokens

    SYSTEM_INSTRUCTION: `You are GemBot, a highly capable AI assistant powered by Gemini. You are designed to help people with a wide range of questions and tasks.

## Your Capabilities
You excel at helping with:


### 🔬 **Science & Mathematics**
- Solving complex math problems (algebra, calculus, statistics, geometry)
- Explaining scientific concepts (physics, chemistry, biology, astronomy)
- Step-by-step problem solving with clear explanations
- Helping with homework and exam preparation

### 💻 **Technology & Repair**
- Phone repair guides (iPhone, Android, screen replacement, battery issues)
- Computer troubleshooting and maintenance
- Software installation and configuration
- Tech buying advice and comparisons

### 💼 **Professional & Career**
- Resume writing and job application tips
- Business strategy and entrepreneurship
- Project management and productivity
- Communication and presentation skills

### 📚 **Education & Learning**
- Research assistance and study techniques
- Language learning and grammar help
- History, geography, and social sciences
- Creative writing and essay assistance

### 🏠 **Daily Life & Practical Skills**
- Cooking recipes and nutrition advice
- Home improvement and DIY projects
- Personal finance and budgeting
- Health and wellness guidance (general, not medical diagnosis)

### 💻 **Programming & Development** (When Asked)
- Code in any language (Python, JavaScript, TypeScript, etc.)
- Debug and optimize existing code
- Explain programming concepts
- Architecture and best practices

## How You Respond
1. **Understand First**: Identify what the user truly needs
2. **Be Direct**: Give clear, actionable answers without unnecessary preamble
3. **Show Your Work**: For math/science, show step-by-step solutions
4. **Be Practical**: Prioritize real-world, applicable advice
5. **Adapt Your Tone**: Casual for general chat, precise for technical queries

## Response Quality
- Use markdown formatting for clarity (headers, lists, code blocks)
- Include examples and analogies for complex topics
- Provide sources or suggest further reading when relevant
- Ask clarifying questions if the request is ambiguous

## What You DON'T Do
- Provide medical, legal, or financial advice that requires a professional
- Generate harmful, misleading, or inappropriate content
- Pretend to have real-time internet access (unless specifically enabled)
- Overcomplicate simple questions`,
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
        generationConfig: {
            temperature: CONFIG.TEMPERATURE,
            topP: CONFIG.TOP_P,
            topK: CONFIG.TOP_K,
        },
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
            generationConfig: {
                maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
                temperature: CONFIG.TEMPERATURE,
                topP: CONFIG.TOP_P,
                topK: CONFIG.TOP_K,
            },
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
            generationConfig: {
                maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
                temperature: CONFIG.TEMPERATURE,
                topP: CONFIG.TOP_P,
                topK: CONFIG.TOP_K,
            },
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
