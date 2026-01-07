"use client";

/**
 * VirtualMessageList Component
 * 
 * Renders a virtualized list of messages for efficient handling
 * of long conversations (100+ messages).
 */

import { useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useVirtualMessages } from "@/hooks/useVirtualMessages";
import Message from "./Message";
import type { Message as MessageType } from "@/types/chat";

interface VirtualMessageListProps {
    messages: MessageType[];
    isStreaming: boolean;
    onRetry?: () => void;
    containerHeight: number;
}

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;

export function VirtualMessageList({
    messages,
    isStreaming,
    onRetry,
    containerHeight,
}: VirtualMessageListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use virtualization only for long conversations
    const shouldVirtualize = messages.length > VIRTUALIZATION_THRESHOLD;

    const {
        virtualItems,
        totalHeight,
        onScroll,
        measureRef,
    } = useVirtualMessages({
        items: messages,
        estimatedItemHeight: 120, // Average message height
        containerHeight,
        overscan: 5,
    });

    // Auto-scroll to bottom for new messages
    useEffect(() => {
        if (containerRef.current) {
            const isNearBottom =
                containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight < 100;

            if (isNearBottom || isStreaming) {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messages, isStreaming]);

    // Scroll handler wrapper
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (shouldVirtualize) {
            onScroll(e);
        }
    }, [shouldVirtualize, onScroll]);

    // Render non-virtualized list for short conversations
    if (!shouldVirtualize) {
        return (
            <div className="max-w-3xl mx-auto">
                <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                        <Message
                            key={message.id ?? `msg-${index}`}
                            message={message}
                            onRetry={message.status === "error" ? onRetry : undefined}
                            isStreaming={isStreaming && index === messages.length - 1}
                        />
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} aria-hidden="true" />
            </div>
        );
    }

    // Render virtualized list for long conversations
    return (
        <div
            ref={containerRef}
            className="relative max-w-3xl mx-auto overflow-y-auto"
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: "relative" }}>
                {virtualItems.map(({ index, item, style }) => (
                    <div
                        key={item.id ?? `msg-${index}`}
                        ref={measureRef(index)}
                        style={style}
                    >
                        <Message
                            message={item}
                            onRetry={item.status === "error" ? onRetry : undefined}
                            isStreaming={isStreaming && index === messages.length - 1}
                        />
                    </div>
                ))}
            </div>
            <div ref={messagesEndRef} aria-hidden="true" />
        </div>
    );
}

export default VirtualMessageList;
