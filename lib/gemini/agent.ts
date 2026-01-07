import { ChatSession, Part, Content } from "@google/generative-ai";
import { executeTool } from "./tools";
import { estimateTokens } from "../tokens";
import { MODEL_CONFIG, Attachment, ResponseMeta } from "./index";

const AGENT_CONFIG = {
    MAX_TOOL_ITERATIONS: 5,
    REQUEST_TIMEOUT: MODEL_CONFIG.REQUEST_TIMEOUT,
    SUPPORTED_MIME_TYPES: [
        "image/png", "image/jpeg", "image/webp", "image/gif",
        "application/pdf",
        "audio/mpeg", "audio/wav", "audio/ogg",
        "video/mp4", "video/webm",
    ],
} as const;

export class GeminiAgent {
    /**
     * Process attachments and convert to Parts
     */
    static processAttachments(attachments: Attachment[]): Part[] {
        const parts: Part[] = [];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB

        for (const attachment of attachments) {
            // Validate MIME type
            if (!AGENT_CONFIG.SUPPORTED_MIME_TYPES.includes(attachment.mimeType as any)) {
                console.warn(`[Attachment] Unsupported MIME type: ${attachment.mimeType}`);
                continue;
            }

            // Validate size
            const estimatedSize = (attachment.data.length * 3) / 4;
            if (estimatedSize > MAX_SIZE) {
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

    /**
     * Handle Tool Execution Loop
     */
    static async handleToolCalls(
        chat: ChatSession,
        initialResponse: string,
        toolCalls: Array<{ name: string; args: Record<string, unknown> }>
    ): Promise<{ text: string; toolsUsed: string[] }> {
        const toolsUsed: string[] = [];
        let iterations = 0;

        while (toolCalls.length > 0 && iterations < AGENT_CONFIG.MAX_TOOL_ITERATIONS) {
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
                return { text: responseText, toolsUsed };
            }

            toolCalls = newCalls;
        }

        return { text: initialResponse, toolsUsed };
    }

    /**
     * Generate a streaming response
     */
    static async streamResponse(
        chat: ChatSession,
        message: string,
        attachments: Attachment[],
        intentInfo: { intent: string; depth: string; config: any }
    ): Promise<Response> {
        const encoder = new TextEncoder();
        const parts = [...this.processAttachments(attachments), { text: message }];

        // Batching configuration for 60fps feeling
        const BATCH_INTERVAL_MS = 16;
        let pendingData: string[] = [];
        let flushScheduled = false;

        const stream = new ReadableStream({
            async start(controller) {
                const startTime = Date.now();
                let fullText = "";
                const toolsUsed: string[] = [];

                // Flush batched data to client
                const flush = () => {
                    if (pendingData.length > 0) {
                        const combined = pendingData.join("");
                        controller.enqueue(encoder.encode(combined));
                        pendingData = [];
                    }
                    flushScheduled = false;
                };

                // Schedule a batched flush
                const scheduleFlush = () => {
                    if (!flushScheduled) {
                        flushScheduled = true;
                        setTimeout(flush, BATCH_INTERVAL_MS);
                    }
                };

                // Send data with optional immediate flush
                const send = (data: string, immediate = false) => {
                    pendingData.push(data);
                    if (immediate) {
                        flush();
                    } else {
                        scheduleFlush();
                    }
                };

                const timeoutId = setTimeout(() => {
                    send(`data: ${JSON.stringify({ error: "Request timeout" })}\n\n`, true);
                    controller.close();
                }, AGENT_CONFIG.REQUEST_TIMEOUT);

                try {
                    const result = await chat.sendMessageStream(parts);
                    const pendingToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

                    for await (const chunk of result.stream) {
                        const candidates = chunk.candidates;
                        if (candidates?.[0]?.content?.parts) {
                            for (const part of candidates[0].content.parts) {
                                if ("functionCall" in part && part.functionCall) {
                                    pendingToolCalls.push({
                                        name: part.functionCall.name,
                                        args: part.functionCall.args as Record<string, unknown>,
                                    });
                                    // Notify client immediately for tool calls
                                    send(`data: ${JSON.stringify({
                                        toolCall: { name: part.functionCall.name, status: "executing" },
                                    })}\n\n`, true);
                                }
                            }
                        }

                        const text = chunk.text();
                        if (text) {
                            fullText += text;
                            send(`data: ${JSON.stringify({ text })}\n\n`);
                        }
                    }

                    if (pendingToolCalls.length > 0) {
                        const toolResult = await GeminiAgent.handleToolCalls(chat, fullText, pendingToolCalls);
                        toolsUsed.push(...toolResult.toolsUsed);

                        if (toolResult.text !== fullText) {
                            fullText = toolResult.text;
                            send(`data: ${JSON.stringify({ text: fullText, isToolResult: true })}\n\n`, true);
                        }
                    }

                    clearTimeout(timeoutId);

                    const meta: ResponseMeta = {
                        processingTimeMs: Date.now() - startTime,
                        estimatedTokens: estimateTokens(fullText),
                        detectedIntent: intentInfo.intent as any,
                        detectedDepth: intentInfo.depth as any,
                        temperatureUsed: intentInfo.config.temperature,
                        maxTokensUsed: intentInfo.config.maxOutputTokens,
                        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
                    };

                    // Final messages flush immediately
                    send(`data: ${JSON.stringify({ done: true, meta })}\n\n`, true);
                    send("data: [DONE]\n\n", true);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : "Stream error";
                    let code = "INTERNAL_ERROR";
                    if (msg.includes("SAFETY")) code = "SAFETY_BLOCKED";
                    else if (msg.includes("QUOTA") || msg.includes("429")) code = "QUOTA_EXCEEDED";

                    send(`data: ${JSON.stringify({ error: msg, code })}\n\n`, true
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
                "Connection": "keep-alive",
            },
        });
    }

    /**
     * Generate a blocking response (non-streaming)
     */
    static async generateResponse(
        chat: ChatSession,
        message: string,
        attachments: Attachment[],
        intentInfo: { intent: string; depth: string; config: any }
    ): Promise<{ response: string; meta: ResponseMeta }> {
        const startTime = Date.now();
        const parts = [...this.processAttachments(attachments), { text: message }];

        const result = await chat.sendMessage(parts);
        let responseText = result.response.text();
        const toolsUsed: string[] = [];

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

        if (toolCalls.length > 0) {
            const toolResult = await GeminiAgent.handleToolCalls(chat, responseText, toolCalls);
            responseText = toolResult.text;
            toolsUsed.push(...toolResult.toolsUsed);
        }

        const meta: ResponseMeta = {
            processingTimeMs: Date.now() - startTime,
            estimatedTokens: estimateTokens(responseText),
            detectedIntent: intentInfo.intent as any,
            detectedDepth: intentInfo.depth as any,
            temperatureUsed: intentInfo.config.temperature,
            maxTokensUsed: intentInfo.config.maxOutputTokens,
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        };

        return { response: responseText, meta };
    }
}
