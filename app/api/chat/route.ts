import { NextResponse } from "next/server";
import type { ChatSession, Content, Part } from "@google/generative-ai";
import { getSessionCache } from "@/lib/cache/chat-cache";
import { sanitizeMessage, detectInjection } from "@/lib/sanitize";
import { getRateLimiter } from "@/lib/rate-limit";
import { trimHistoryByTokens, estimateTokens } from "@/lib/tokens";
import {
    getModel,
    createGenerationConfig,
    executeTool,
    MODEL_CONFIG,
    type Attachment,
    type IntentType,
    type ResponseMeta,
} from "@/lib/gemini";

// ============================================================================
// Error Handling
// ============================================================================

class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = "AppError";
    }
}

class RateLimitError extends AppError {
    constructor(retryAfter: number) {
        super(`Too many requests. Please wait ${retryAfter}s.`, 429, "RATE_LIMITED");
        this.name = "RateLimitError";
    }
}

function handleError(error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    const status = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";

    console.error(`[API Error] ${code}:`, message);

    return NextResponse.json(
        { error: message, code },
        { status }
    );
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    MAX_OUTPUT_TOKENS: MODEL_CONFIG.MAX_OUTPUT_TOKENS,
    MAX_HISTORY_MESSAGES: 30,
    REQUEST_TIMEOUT: MODEL_CONFIG.REQUEST_TIMEOUT,
    MAX_TOOL_ITERATIONS: 5, // Prevent infinite tool loops
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_MIME_TYPES: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "application/pdf",
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "video/mp4",
        "video/webm",
    ],
} as const;

// ============================================================================
// Service Setup
// ============================================================================

const sessionCache = getSessionCache();

// ============================================================================
// History Management
// ============================================================================

type HistoryMessage = Content;

function trimHistory(history: HistoryMessage[]): HistoryMessage[] {
    if (!Array.isArray(history)) return [];

    // First: limit by message count (fast)
    let trimmed = history.slice(-CONFIG.MAX_HISTORY_MESSAGES);

    // Second: limit by tokens (prevents overflow)
    trimmed = trimHistoryByTokens(trimmed, 8000);

    return trimmed;
}

// ============================================================================
// Multimodal Processing
// ============================================================================

function processAttachments(attachments: Attachment[]): Part[] {
    const parts: Part[] = [];

    for (const attachment of attachments) {
        // Validate MIME type
        if (!CONFIG.SUPPORTED_MIME_TYPES.includes(attachment.mimeType as typeof CONFIG.SUPPORTED_MIME_TYPES[number])) {
            console.warn(`[Attachment] Unsupported MIME type: ${attachment.mimeType}`);
            continue;
        }

        // Validate size (estimate from base64)
        const estimatedSize = (attachment.data.length * 3) / 4;
        if (estimatedSize > CONFIG.MAX_ATTACHMENT_SIZE) {
            console.warn(`[Attachment] File too large: ${estimatedSize} bytes`);
            continue;
        }

        parts.push({
            inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data,
            },
        });
    }

    return parts;
}

// ============================================================================
// Function Calling Handler
// ============================================================================

async function handleToolCalls(
    chat: ChatSession,
    initialResponse: string,
    toolCalls: Array<{ name: string; args: Record<string, unknown> }>,
): Promise<{ text: string; toolsUsed: string[] }> {
    const toolsUsed: string[] = [];
    let iterations = 0;

    // Execute all tool calls
    while (toolCalls.length > 0 && iterations < CONFIG.MAX_TOOL_ITERATIONS) {
        iterations++;

        const toolResults = await Promise.all(
            toolCalls.map(async (call) => {
                toolsUsed.push(call.name);
                const result = await executeTool(call.name, call.args);
                return {
                    functionResponse: {
                        name: call.name,
                        response: result.success
                            ? { result: result.result }
                            : { error: result.error },
                    },
                };
            })
        );

        // Send tool results back to model
        const response = await chat.sendMessage(toolResults as Part[]);
        const responseText = response.response.text();

        // Check if model wants to call more tools
        const candidates = response.response.candidates;
        const newCalls: typeof toolCalls = [];

        if (candidates?.[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                if ("functionCall" in part && part.functionCall) {
                    newCalls.push({
                        name: part.functionCall.name,
                        args: part.functionCall.args as Record<string, unknown>,
                    });
                }
            }
        }

        if (newCalls.length === 0) {
            // No more tool calls, return final response
            return { text: responseText, toolsUsed };
        }

        toolCalls = newCalls;
    }

    return { text: initialResponse, toolsUsed };
}

// ============================================================================
// Streaming Handler (with Tool Support)
// ============================================================================

async function streamResponse(
    userId: string,
    message: string,
    history: HistoryMessage[] = [],
    attachments: Attachment[] = [],
    responseFormat?: "text" | "json"
): Promise<Response> {
    const model = getModel();
    const encoder = new TextEncoder();

    // Get intent-based generation config
    const { config: generationConfig, intent } = createGenerationConfig(message);

    // Configure for JSON if requested
    const finalConfig = responseFormat === "json"
        ? { ...generationConfig, responseMimeType: "application/json" }
        : generationConfig;

    let chat = sessionCache.get(userId);

    if (!chat) {
        chat = model.startChat({
            history: trimHistory(history),
            generationConfig: {
                maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
                ...finalConfig,
            },
        });
        sessionCache.set(userId, chat, history);
    }

    // Build message parts
    const parts: Part[] = [];

    // Add attachments first (if any)
    if (attachments.length > 0) {
        parts.push(...processAttachments(attachments));
    }

    // Add text message
    parts.push({ text: message });

    const stream = new ReadableStream({
        async start(controller) {
            const startTime = Date.now();
            let fullText = "";
            const toolsUsed: string[] = [];

            try {
                // Use timeout with AbortController
                const timeoutId = setTimeout(() => {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "Request timeout" })}\n\n`)
                    );
                    controller.close();
                }, CONFIG.REQUEST_TIMEOUT);

                const result = await chat!.sendMessageStream(parts);

                // Collect function calls during streaming
                const pendingToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

                for await (const chunk of result.stream) {
                    // Check for function calls
                    const candidates = chunk.candidates;
                    if (candidates?.[0]?.content?.parts) {
                        for (const part of candidates[0].content.parts) {
                            if ("functionCall" in part && part.functionCall) {
                                pendingToolCalls.push({
                                    name: part.functionCall.name,
                                    args: part.functionCall.args as Record<string, unknown>,
                                });

                                // Notify client that we're executing a tool
                                controller.enqueue(
                                    encoder.encode(
                                        `data: ${JSON.stringify({
                                            toolCall: {
                                                name: part.functionCall.name,
                                                status: "executing",
                                            },
                                        })}\n\n`
                                    )
                                );
                            }
                        }
                    }

                    const text = chunk.text();
                    if (text) {
                        fullText += text;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                        );
                    }
                }

                // Handle tool calls if any
                if (pendingToolCalls.length > 0) {
                    const toolResult = await handleToolCalls(chat!, fullText, pendingToolCalls);
                    toolsUsed.push(...toolResult.toolsUsed);

                    // Stream the tool result response
                    if (toolResult.text !== fullText) {
                        const additionalText = toolResult.text;
                        fullText = additionalText;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ text: additionalText, isToolResult: true })}\n\n`)
                        );
                    }
                }

                clearTimeout(timeoutId);

                // Send metadata at end
                const meta: ResponseMeta = {
                    processingTimeMs: Date.now() - startTime,
                    estimatedTokens: estimateTokens(fullText),
                    detectedIntent: intent,
                    temperatureUsed: finalConfig.temperature,
                    toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
                };

                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ done: true, meta })}\n\n`)
                );
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (error) {
                const msg = error instanceof Error ? error.message : "Stream error";

                // Detect specific error types
                let code = "INTERNAL_ERROR";
                if (msg.includes("SAFETY")) code = "SAFETY_BLOCKED";
                else if (msg.includes("QUOTA") || msg.includes("429")) code = "QUOTA_EXCEEDED";
                else if (msg.includes("INVALID")) code = "INVALID_REQUEST";

                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ error: msg, code })}\n\n`)
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
    history: HistoryMessage[] = [],
    attachments: Attachment[] = [],
    responseFormat?: "text" | "json"
): Promise<{ response: string; meta: ResponseMeta }> {
    const model = getModel();
    const startTime = Date.now();

    // Get intent-based generation config
    const { config: generationConfig, intent } = createGenerationConfig(message);

    const finalConfig = responseFormat === "json"
        ? { ...generationConfig, responseMimeType: "application/json" }
        : generationConfig;

    let chat = sessionCache.get(userId);

    if (!chat) {
        chat = model.startChat({
            history: trimHistory(history),
            generationConfig: {
                maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
                ...finalConfig,
            },
        });
        sessionCache.set(userId, chat, history);
    }

    // Build message parts
    const parts: Part[] = [];
    if (attachments.length > 0) {
        parts.push(...processAttachments(attachments));
    }
    parts.push({ text: message });

    const result = await chat.sendMessage(parts);
    let responseText = result.response.text();
    const toolsUsed: string[] = [];

    // Check for function calls
    const candidates = result.response.candidates;
    const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

    if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
            if ("functionCall" in part && part.functionCall) {
                toolCalls.push({
                    name: part.functionCall.name,
                    args: part.functionCall.args as Record<string, unknown>,
                });
            }
        }
    }

    // Handle tool calls
    if (toolCalls.length > 0) {
        const toolResult = await handleToolCalls(chat, responseText, toolCalls);
        responseText = toolResult.text;
        toolsUsed.push(...toolResult.toolsUsed);
    }

    const meta: ResponseMeta = {
        processingTimeMs: Date.now() - startTime,
        estimatedTokens: estimateTokens(responseText),
        detectedIntent: intent,
        temperatureUsed: finalConfig.temperature,
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    };

    return { response: responseText, meta };
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
        const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments : [];
        const responseFormat = body.responseFormat === "json" ? "json" : "text";

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

        // Log request details
        console.log(`[Chat] User: ${userId.slice(0, 8)}... | Attachments: ${attachments.length} | Format: ${responseFormat}`);

        // Handle request
        if (stream) {
            return streamResponse(userId, cleanMessage, history, attachments, responseFormat);
        }

        const { response, meta } = await sendMessage(userId, cleanMessage, history, attachments, responseFormat);

        return NextResponse.json({
            message: response,
            conversationId: userId,
            timestamp: new Date().toISOString(),
            meta,
        });
    } catch (error) {
        return handleError(error);
    }
}
