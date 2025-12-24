/**
 * Chat Domain Types
 * 
 * Central type definitions for the chat feature.
 * Following enterprise patterns with strict typing.
 */

/**
 * Request payload for chat API
 */
export interface ChatRequest {
    /** User's message content */
    message: string;
    /** Unique user identifier for session management */
    userId: string;
    /** Optional conversation context */
    context?: {
        /** Maximum tokens for response */
        maxTokens?: number;
        /** Temperature for response generation (0-1) */
        temperature?: number;
    };
    /** Optional conversation context for syncing */
    history?: Array<{ role: string, parts: Array<{ text: string }> }>;
}

/**
 * Successful chat response
 */
export interface ChatResponse {
    /** AI-generated message */
    message: string;
    /** Conversation/session identifier */
    conversationId: string;
    /** ISO timestamp of response */
    timestamp: string;
    /** Optional metadata */
    meta?: {
        /** Token count used */
        tokensUsed?: number;
        /** Processing time in ms */
        processingTime?: number;
    };
}

/**
 * Error response format
 */
export interface ErrorResponse {
    /** Human-readable error message */
    error: string;
    /** Machine-readable error code */
    code: string;
    /** ISO timestamp of error */
    timestamp: string;
    /** Optional validation errors array */
    validationErrors?: string[];
    /** Optional retry-after seconds for rate limits */
    retryAfter?: number;
}

/**
 * Attachment metadata for display
 */
export interface AttachmentMeta {
    mimeType: string;
    filename: string;
}

/**
 * Response metadata from API
 */
export interface MessageMeta {
    processingTimeMs?: number | undefined;
    estimatedTokens?: number | undefined;
    detectedIntent?: string | undefined;
    temperatureUsed?: number | undefined;
    toolsUsed?: string[] | undefined;
}

/**
 * Message type for UI rendering
 */
export interface Message {
    /** Message sender */
    sender: "user" | "bot";
    /** Message content */
    text: string;
    /** When the message was sent */
    timestamp: Date;
    /** Optional message ID for tracking */
    id?: string | undefined;
    /** Message status for optimistic updates */
    status?: "sending" | "sent" | "error" | undefined;
    /** Attachments included with this message */
    attachments?: AttachmentMeta[] | undefined;
    /** Response metadata (for bot messages) */
    meta?: MessageMeta | undefined;
}

/**
 * Stored message format (for localStorage/persistence)
 */
export interface StoredMessage extends Omit<Message, "timestamp"> {
    /** ISO string timestamp for serialization */
    timestamp: string;
}

/**
 * Chat session configuration
 */
export interface SessionConfig {
    /** Maximum messages to keep in history */
    maxHistory: number;
    /** Session timeout in milliseconds */
    timeout: number;
    /** Model configuration */
    model: {
        name: string;
        maxOutputTokens: number;
        temperature?: number;
    };
}

/**
 * API Response type union
 */
export type ApiResponse = ChatResponse | ErrorResponse;

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
    return "error" in response && "code" in response;
}

/**
 * Type guard to check if response is successful
 */
export function isChatResponse(response: ApiResponse): response is ChatResponse {
    return "message" in response && "conversationId" in response;
}

/**
 * Convert stored message to runtime message
 */
export function toMessage(stored: StoredMessage): Message {
    return {
        ...stored,
        timestamp: new Date(stored.timestamp),
    };
}

/**
 * Convert runtime message to stored format
 */
export function toStoredMessage(message: Message): StoredMessage {
    return {
        ...message,
        timestamp: message.timestamp.toISOString(),
    };
}
