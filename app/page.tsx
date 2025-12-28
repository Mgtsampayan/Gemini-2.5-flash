"use client";

/**
 * Chat Page - Enterprise Edition 2025
 *
 * Features:
 * - Premium glassmorphism UI
 * - Collapsible sidebar with conversation history
 * - Dark/light theme toggle
 * - Streaming responses with typewriter effect
 * - Message actions (copy, retry)
 * - Keyboard shortcuts
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Message from "./components/Message";
import TypingIndicator from "./components/TypingIndicator";
import { Sidebar } from "./components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { generateId } from "@/lib/utils";
import {
  SparkleIcon,
  MenuIcon,
  TrashIcon,
  SendIcon,
  StopIcon,
  LoadingIcon
} from "@/lib/icons";

// ============================================================================
// Types
// ============================================================================

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

// ============================================================================
// Component
// ============================================================================

export default function Home() {
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("chatbot_user_id");
      if (stored) return stored;
      const newId = `user-${generateId()}`;
      localStorage.setItem("chatbot_user_id", newId);
      return newId;
    }
    return `user-${generateId()}`;
  });
  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use the streaming chat hook
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    retryLastMessage,
  } = useChat({
    userId,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: err.message || "Failed to connect. Please try again.",
      });
    },
  });

  // Initialize audio on mount
  useEffect(() => {
    messageSound.current = new Audio("/message.mp3");
    return () => {
      messageSound.current?.pause();
      messageSound.current = null;
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play notification sound
  const playMessageSound = useCallback(() => {
    messageSound.current?.play().catch(() => {
      /* ignore autoplay restrictions */
    });
  }, []);

  // Update conversation when messages change
  useEffect(() => {
    if (messages.length > 0 && activeConversationId) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversationId
              ? {
                ...conv,
                lastMessage: lastMessage.text.slice(0, 50),
                timestamp: new Date(),
                messageCount: messages.length,
              }
              : conv
          )
        );
      }
    }
  }, [messages, activeConversationId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to stop streaming or clear input
      if (e.key === "Escape") {
        if (isStreaming) {
          stopStreaming();
        } else if (document.activeElement === inputRef.current) {
          setInput("");
        }
      }

      // Ctrl+Shift+N for new chat
      if (e.key === "n" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handleNewConversation();
      }

      // Ctrl+Shift+S to toggle sidebar
      if (e.key === "s" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isStreaming, stopStreaming]);

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }, [error, toast]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading) return;

      // Create conversation if none exists
      if (!activeConversationId) {
        const newConv: Conversation = {
          id: generateId(),
          title: trimmedInput.slice(0, 30) + (trimmedInput.length > 30 ? "..." : ""),
          lastMessage: trimmedInput.slice(0, 50),
          timestamp: new Date(),
          messageCount: 1,
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
      }

      setInput("");
      playMessageSound();
      await sendMessage(trimmedInput);
      playMessageSound();
    },
    [input, isLoading, activeConversationId, playMessageSound, sendMessage]
  );

  // Handle new conversation
  const handleNewConversation = useCallback(() => {
    clearMessages();
    setActiveConversationId(null);
    setInput("");
    inputRef.current?.focus();
  }, [clearMessages]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    // In a real app, you'd load messages from storage/API here
  }, []);

  // Handle conversation deletion
  const handleDeleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    if (activeConversationId === id) {
      clearMessages();
      setActiveConversationId(null);
    }
    toast({
      title: "Conversation Deleted",
      description: "The conversation has been removed.",
    });
  }, [activeConversationId, clearMessages, toast]);

  // Handle clear chat
  const handleClearChat = useCallback(() => {
    clearMessages();
    toast({
      title: "Chat Cleared",
      description: "Your conversation history has been removed.",
    });
  }, [clearMessages, toast]);

  return (
    <main className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <MenuIcon className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-lg font-semibold text-gradient">AI Chatbot 2025</h1>
                <p className="text-xs text-muted-foreground">
                  Powered by Gemini 3.0 Flash Preview • Developed by Gemuel Sampayan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleClearChat}
                title="Clear chat"
              >
                <TrashIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen onSuggestionClick={(suggestion) => {
              setInput(suggestion);
              inputRef.current?.focus();
            }} />
          ) : (
            <div className="max-w-3xl mx-auto">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <Message
                    key={message.id ?? `msg-${messages.indexOf(message)}`}
                    message={message}
                    onRetry={message.status === "error" ? retryLastMessage : undefined}
                    isStreaming={isStreaming && message === messages[messages.length - 1]}
                  />
                ))}
                {isLoading && messages[messages.length - 1]?.sender !== "bot" && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="shrink-0 border-t border-border/50 bg-card/50 backdrop-blur-xl p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && input.trim() && !isLoading) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Send a message..."
                  disabled={isLoading}
                  maxLength={10000}
                  className="pr-16 h-12 rounded-xl bg-background/80 border-border/50 focus:border-primary/50 transition-colors"
                  aria-label="Message input"
                  autoComplete="off"
                />

                {/* Character count indicator with limit warning */}
                {input.length > 0 && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-colors ${input.length > 9000
                    ? "text-destructive font-medium"
                    : input.length > 8000
                      ? "text-warning"
                      : "text-muted-foreground/50"
                    }`}>
                    {input.length.toLocaleString()}/10,000
                  </span>
                )}
              </div>

              {isStreaming ? (
                <Button
                  type="button"
                  onClick={stopStreaming}
                  size="icon"
                  variant="destructive"
                  className="h-12 w-12 rounded-xl"
                  aria-label="Stop generating"
                >
                  <StopIcon className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="h-12 w-12 rounded-xl btn-premium"
                  aria-label="Send message"
                >
                  <span className="relative z-10">
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <LoadingIcon className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <SendIcon className="h-5 w-5" />
                    )}
                  </span>
                </Button>
              )}
            </div>

            {/* Keyboard hints */}
            <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground/50">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted/50">Enter</kbd> to send
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted/50">Esc</kbd>{" "}
                {isStreaming ? "to stop" : "to clear"}
              </span>
            </div>
          </form>
        </div>
      </div>

      <Toaster />
    </main>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick?: (suggestion: string) => void }) {
  const suggestions = [
    { emoji: "💻", text: "Help me write some code" },
    { emoji: "📝", text: "Write something creative" },
    { emoji: "🔬", text: "Explain a complex concept" },
    { emoji: "💡", text: "Give me creative ideas" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center h-full text-center px-4"
    >
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
          <SparkleIcon className="w-10 h-10 text-white" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent blur-xl opacity-50"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-gradient mb-2"
      >
        Welcome to AI Chatbot 2025
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground max-w-md mb-6"
      >
        Powered by Google Gemini 3.0 Flash Preview. Ask me anything about coding, science,
        creative writing, or just chat!
      </motion.p>

      {/* Quick action suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {suggestions.map(({ emoji, text }) => (
          <button
            key={text}
            onClick={() => onSuggestionClick?.(`${text}`)}
            className="px-4 py-2 rounded-full text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50 hover:border-primary/30 hover:shadow-sm"
          >
            {emoji} {text}
          </button>
        ))}
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-xs text-muted-foreground/50"
      >
        <kbd className="px-2 py-1 bg-muted/50 rounded">Ctrl+Shift+N</kbd> New chat •{" "}
        <kbd className="px-2 py-1 bg-muted/50 rounded">Ctrl+Shift+S</kbd> Toggle sidebar
      </motion.div>
    </motion.div>
  );
}
