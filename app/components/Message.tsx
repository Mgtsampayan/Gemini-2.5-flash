"use client";

import { cn, formatTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { Message as MessageType } from "@/types/chat";
import Markdown from "./Markdown";
import { useState, useCallback } from "react";

interface MessageProps {
    message: MessageType;
    onRetry?: (() => void) | undefined;
    isStreaming?: boolean;
}

const messageAnimationVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const },
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.98,
        transition: { duration: 0.15, ease: "easeIn" as const },
    },
};

export default function Message({
    message,
    onRetry,
    isStreaming = false,
}: MessageProps) {
    const isUser = message.sender === "user";
    const isFailed = message.status === "error";
    const isSending = message.status === "sending";
    const [copied, setCopied] = useState(false);

    const formattedTime = (() => {
        try {
            if (!(message.timestamp instanceof Date)) {
                return "--:--";
            }
            return formatTime(message.timestamp);
        } catch {
            return "--:--";
        }
    })();

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(message.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Ignore clipboard errors
        }
    }, [message.text]);

    return (
        <motion.div
            variants={messageAnimationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
            className={cn(
                "flex items-end gap-3 mb-4 group",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Avatar
                className={cn(
                    "w-8 h-8 shrink-0 ring-2 ring-offset-2 ring-offset-background transition-all",
                    isUser ? "ring-primary/30" : "ring-accent/30"
                )}
            >
                <AvatarImage
                    src={isUser ? "/user-avatar.svg" : "/bot-avatar.svg"}
                    alt={isUser ? "You" : "AI Assistant"}
                />
                <AvatarFallback
                    className={cn(
                        "text-xs font-medium",
                        isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                    )}
                >
                    {isUser ? "U" : "AI"}
                </AvatarFallback>
            </Avatar>

            <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
                <div
                    className={cn(
                        "relative px-4 py-3 rounded-2xl transition-all",
                        isUser
                            ? "message-user rounded-br-sm"
                            : "message-bot rounded-bl-sm border border-border/50",
                        isFailed && "border-2 border-destructive/50 bg-destructive/5",
                        isSending && "opacity-70"
                    )}
                >
                    {isSending && !isUser && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
                    )}

                    {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
                            {message.text}
                        </p>
                    ) : (
                        <Markdown
                            content={message.text || "..."}
                            className="text-sm"
                            isStreaming={isSending || isStreaming}
                        />
                    )}
                </div>

                <div
                    className={cn(
                        "flex items-center gap-2 px-1",
                        isUser ? "justify-end" : "justify-start",
                        "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    )}
                >
                    <span
                        className="text-[10px] text-muted-foreground/70"
                        title={message.timestamp.toLocaleString()}
                    >
                        {formattedTime}
                    </span>

                    {!isUser && message.status === "sent" && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-muted"
                                onClick={handleCopy}
                                title={copied ? "Copied!" : "Copy message"}
                            >
                                {copied ? (
                                    <CheckIcon className="w-3 h-3 text-emerald-500" />
                                ) : (
                                    <CopyIcon className="w-3 h-3 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    )}

                    {isFailed && onRetry && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={onRetry}
                        >
                            <RefreshIcon className="w-3 h-3 mr-1" />
                            Retry
                        </Button>
                    )}

                    {isSending && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                <LoadingIcon className="w-3 h-3" />
                            </motion.div>
                            Generating...
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function CopyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    );
}

function LoadingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}