"use client";

/**
 * useChat Hook (Simplified)
 * 
 * Clean, minimal chat hook for easy debugging.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { generateId } from "@/lib/utils";
import type { Message } from "@/types/chat";

interface UseChatOptions {
    userId: string;
    onError?: (error: Error) => void;
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    isStreaming: boolean;
    error: Error | null;
    sendMessage: (text: string) => Promise<void>;
    stopStreaming: () => void;
    clearMessages: () => void;
    retryLastMessage: () => void;
}

const STORAGE_KEY = "chatHistory";

export function useChat({ userId, onError }: UseChatOptions): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const lastUserMsgRef = useRef<string | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setMessages(
                    parsed.map((m: { timestamp: string } & Omit<Message, 'timestamp'>) => ({
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
    }, []);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            lastUserMsgRef.current = trimmed;
            setError(null);

            // Add user message
            const userMsg: Message = {
                id: generateId(),
                sender: "user",
                text: trimmed,
                timestamp: new Date(),
                status: "sent",
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

            try {
                abortRef.current = new AbortController();

                // Retry logic for rate limits
                let retries = 0;
                const maxRetries = 2;
                let res: Response | null = null;

                while (retries <= maxRetries) {
                    res = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: trimmed,
                            userId,
                            stream: true,
                            history: historyForServer,
                        }),
                        signal: abortRef.current.signal,
                    });

                    // If rate limited (429), wait and retry
                    if (res.status === 429 && retries < maxRetries) {
                        retries++;
                        const waitTime = 2000 * retries; // 2s, then 4s
                        console.log(`[Rate Limit] Waiting ${waitTime}ms before retry ${retries}...`);
                        await new Promise(r => setTimeout(r, waitTime));
                        continue;
                    }
                    break;
                }

                if (!res || !res.ok) {
                    const errData = await res?.json().catch(() => ({})) || {};
                    throw new Error(errData.error || `HTTP ${res?.status || "unknown"}`);
                }

                // Stream the response
                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                let fullText = "";

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
                                        if (parsed.text) {
                                            fullText += parsed.text;
                                            setMessages((prev) =>
                                                prev.map((m) =>
                                                    m.id === botId ? { ...m, text: fullText } : m
                                                )
                                            );
                                        }
                                        if (parsed.error) {
                                            throw new Error(parsed.error);
                                        }
                                    } catch (e) {
                                        if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
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
                            ? { ...m, text: fullText, status: "sent", timestamp: new Date() }
                            : m
                    )
                );

            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    setMessages((prev) => prev.filter((m) => m.id !== botId));
                } else {
                    const finalErr = err instanceof Error ? err : new Error(String(err));
                    setError(finalErr);
                    onError?.(finalErr);
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === botId ? { ...m, status: "error" } : m
                        )
                    );
                }
            } finally {
                setIsLoading(false);
                setIsStreaming(false);
                abortRef.current = null;
            }
        },
        [userId, isLoading, messages, onError]
    );

    const clearMessages = useCallback(() => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
        setError(null);
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
            const msg = lastUserMsgRef.current;
            setTimeout(() => sendMessage(msg), 0);
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
        sendMessage,
        stopStreaming,
        clearMessages,
        retryLastMessage,
    };
}

export default useChat;
