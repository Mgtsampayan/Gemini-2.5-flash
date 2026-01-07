"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Conversation {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: Date;
    messageCount: number;
}

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export function Sidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    isCollapsed,
    onToggleCollapse,
}: SidebarProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isCollapsed ? 64 : 280,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
                "h-full flex flex-col border-r border-sidebar-border",
                "bg-sidebar-background/80 backdrop-blur-xl"
            )}
        >
            {/* Header */}
            <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
                                <SparkleIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-sidebar-foreground">
                                Conversations
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleCollapse}
                    className="h-8 w-8 shrink-0"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <motion.div
                        animate={{ rotate: isCollapsed ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                    </motion.div>
                </Button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
                <Button
                    onClick={onNewConversation}
                    className={cn(
                        "w-full justify-start gap-2 btn-premium text-white",
                        isCollapsed && "justify-center px-0"
                    )}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" />
                        {!isCollapsed && "New Chat"}
                    </span>
                </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1">
                <AnimatePresence mode="popLayout">
                    {conversations.map((conversation, index) => (
                        <motion.div
                            key={conversation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.05 }}
                            onMouseEnter={() => setHoveredId(conversation.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectConversation(conversation.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onSelectConversation(conversation.id);
                                    }
                                }}
                                className={cn(
                                    "w-full p-2 rounded-lg text-left transition-all duration-200 cursor-pointer",
                                    "hover:bg-sidebar-accent/10 group relative",
                                    activeConversationId === conversation.id &&
                                    "bg-sidebar-accent/15 text-sidebar-accent"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <ChatIcon
                                        className={cn(
                                            "w-4 h-4 shrink-0",
                                            activeConversationId === conversation.id
                                                ? "text-sidebar-accent"
                                                : "text-sidebar-foreground/60"
                                        )}
                                    />

                                    {!isCollapsed && (
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-sidebar-foreground">
                                                {conversation.title || "New Conversation"}
                                            </p>
                                            <p className="text-xs text-sidebar-foreground/50 truncate">
                                                {conversation.messageCount} messages
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Delete button on hover */}
                                {!isCollapsed && hoveredId === conversation.id && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteConversation(conversation.id);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-destructive/10 text-sidebar-foreground/40 hover:text-destructive transition-colors"
                                        aria-label="Delete conversation"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {conversations.length === 0 && !isCollapsed && (
                    <div className="text-center py-8 text-sidebar-foreground/50">
                        <ChatIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Start a new chat!</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!isCollapsed && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 border-t border-sidebar-border"
                >
                    <p className="text-xs text-sidebar-foreground/40 text-center">
                        Powered by Gemini 2.5 Flash
                    </p>
                </motion.div>
            )}
        </motion.aside>
    );
}

// Icons
function SparkleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
            <path d="M19 15L19.54 17.46L22 18L19.54 18.54L19 21L18.46 18.54L16 18L18.46 17.46L19 15Z" />
            <path d="M5 17L5.54 19.46L8 20L5.54 20.54L5 23L4.46 20.54L2 20L4.46 19.46L5 17Z" />
        </svg>
    );
}

function ChevronLeftIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m15 18-6-6 6-6" />
        </svg>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}

function ChatIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    );
}

export default Sidebar;
