"use client";

/**
 * useChat Hook - Enhanced Edition
 *
 * Supports streaming, attachments, retry with exponential backoff.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { generateId } from "@/lib/utils";
import type { Message } from "@/types/chat";
import type { Attachment, ResponseMeta } from "@/lib/gemini";

interface UseChatOptions {
    userId: string;
    onError?: (error: Error) => void;
    onToolCall?: (toolName: string, status: "executing" | "complete") => void;
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    isStreaming: boolean;
    error: Error | null;
    currentTool: string | null;
    lastMeta: ResponseMeta | null;
    sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
    stopStreaming: () => void;
    clearMessages: () => void;
    retryLastMessage: () => void;
}

const STORAGE_KEY = "chatHistory";
const MAX_RETRIES = 3;

/**
 * Exponential backoff delay calculation
 */
function getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
}

export function useChat({ userId, onError, onToolCall }: UseChatOptions): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [currentTool, setCurrentTool] = useState<string | null>(null);
    const [lastMeta, setLastMeta] = useState<ResponseMeta | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const lastUserMsgRef = useRef<{ text: string; attachments?: Attachment[] | undefined } | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setMessages(
                    parsed.map((m: { timestamp: string } & Omit<Message, "timestamp">) => ({
                        ...m,
                        timestamp: new Date(m.timestamp),
                    }))
                );
            }
        } catch {
            // Ignore storage errors
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        try {
            const toStore = messages.map((m) => ({
                ...m,
                timestamp: m.timestamp.toISOString(),
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch {
            // Ignore storage errors
        }
    }, [messages]);

    const stopStreaming = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsStreaming(false);
        setIsLoading(false);
        setCurrentTool(null);
    }, []);

    const sendMessage = useCallback(
        async (text: string, attachments?: Attachment[]) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            lastUserMsgRef.current = { text: trimmed, attachments };
            setError(null);
            setCurrentTool(null);

            // Add user message
            const userMsg: Message = {
                id: generateId(),
                sender: "user",
                text: trimmed,
                timestamp: new Date(),
                status: "sent",
                ...(attachments && attachments.length > 0 && {
                    attachments: attachments.map(a => ({
                        mimeType: a.mimeType,
                        filename: a.filename || "attachment"
                    }))
                }),
            };

            // Build history including current message
            const historyForServer = [
                ...messages.map((m) => ({
                    role: m.sender === "user" ? "user" : "model",
                    parts: [{ text: m.text }],
                })),
                { role: "user", parts: [{ text: trimmed }] },
            ];

            setMessages((prev) => [...prev, userMsg]);
            setIsLoading(true);
            setIsStreaming(true);

            // Prepare bot message placeholder
            const botId = generateId();
            const botMsg: Message = {
                id: botId,
                sender: "bot",
                text: "",
                timestamp: new Date(),
                status: "sending",
            };
            setMessages((prev) => [...prev, botMsg]);

            let retries = 0;

            while (retries <= MAX_RETRIES) {
                try {
                    abortRef.current = new AbortController();

                    const res = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: trimmed,
                            userId,
                            stream: true,
                            history: historyForServer,
                            attachments: attachments || [],
                        }),
                        signal: abortRef.current.signal,
                    });

                    // Handle rate limiting with exponential backoff
                    if (res.status === 429 && retries < MAX_RETRIES) {
                        retries++;
                        const delay = getBackoffDelay(retries);
                        console.log(`[Rate Limit] Retry ${retries}/${MAX_RETRIES} in ${delay}ms`);
                        await new Promise((r) => setTimeout(r, delay));
                        continue;
                    }

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `HTTP ${res.status}`);
                    }

                    // Stream the response
                    const reader = res.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullText = "";
                    let receivedMeta: ResponseMeta | null = null;

                    if (reader) {
                        let done = false;
                        while (!done) {
                            const { value, done: d } = await reader.read();
                            done = d;
                            if (value) {
                                const chunk = decoder.decode(value, { stream: true });
                                const lines = chunk.split("\n");

                                for (const line of lines) {
                                    if (line.startsWith("data: ")) {
                                        const data = line.slice(6);
                                        if (data === "[DONE]") continue;

                                        try {
                                            const parsed = JSON.parse(data);

                                            // Handle tool call notifications
                                            if (parsed.toolCall) {
                                                setCurrentTool(parsed.toolCall.name);
                                                onToolCall?.(parsed.toolCall.name, parsed.toolCall.status);
                                            }

                                            // Handle text chunks
                                            if (parsed.text) {
                                                if (parsed.isToolResult) {
                                                    // Replace with tool result
                                                    fullText = parsed.text;
                                                } else {
                                                    fullText += parsed.text;
                                                }
                                                setMessages((prev) =>
                                                    prev.map((m) =>
                                                        m.id === botId ? { ...m, text: fullText } : m
                                                    )
                                                );
                                            }

                                            // Handle completion metadata
                                            if (parsed.done && parsed.meta) {
                                                receivedMeta = parsed.meta;
                                                setLastMeta(parsed.meta);
                                                setCurrentTool(null);
                                            }

                                            if (parsed.error) {
                                                throw new Error(parsed.error);
                                            }
                                        } catch (e) {
                                            if (
                                                e instanceof Error &&
                                                e.message !== "Unexpected end of JSON input"
                                            ) {
                                                throw e;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Mark as complete
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === botId
                                ? {
                                    ...m,
                                    text: fullText,
                                    status: "sent",
                                    timestamp: new Date(),
                                    meta: receivedMeta || undefined,
                                }
                                : m
                        )
                    );

                    // Success - break out of retry loop
                    break;
                } catch (err) {
                    if (err instanceof Error && err.name === "AbortError") {
                        setMessages((prev) => prev.filter((m) => m.id !== botId));
                        break;
                    }

                    // Check if we should retry
                    if (retries < MAX_RETRIES) {
                        retries++;
                        const delay = getBackoffDelay(retries);
                        console.log(`[Error] Retry ${retries}/${MAX_RETRIES} in ${delay}ms`);
                        await new Promise((r) => setTimeout(r, delay));
                        continue;
                    }

                    // Max retries exceeded
                    const finalErr = err instanceof Error ? err : new Error(String(err));
                    setError(finalErr);
                    onError?.(finalErr);
                    setMessages((prev) =>
                        prev.map((m) => (m.id === botId ? { ...m, status: "error" } : m))
                    );
                    break;
                }
            }

            setIsLoading(false);
            setIsStreaming(false);
            setCurrentTool(null);
            abortRef.current = null;
        },
        [userId, isLoading, messages, onError, onToolCall]
    );

    const clearMessages = useCallback(() => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
        setError(null);
        setLastMeta(null);
    }, []);

    const retryLastMessage = useCallback(() => {
        if (lastUserMsgRef.current && !isLoading) {
            // Remove the last error message and retry
            setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.status === "error") {
                    return prev.slice(0, -2); // Remove both failed bot msg and user msg
                }
                return prev;
            });
            const { text, attachments } = lastUserMsgRef.current;
            setTimeout(() => sendMessage(text, attachments), 0);
        }
    }, [isLoading, sendMessage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    return {
        messages,
        isLoading,
        isStreaming,
        error,
        currentTool,
        lastMeta,
        sendMessage,
        stopStreaming,
        clearMessages,
        retryLastMessage,
    };
}

export default useChat;
