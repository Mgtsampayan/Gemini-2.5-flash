/**
 * Shared Error Types
 * 
 * Unified error handling across the application.
 */

// ============================================================================
// Error Codes
// ============================================================================

export type AppErrorCode =
    | "RATE_LIMITED"
    | "SAFETY_BLOCKED"
    | "QUOTA_EXCEEDED"
    | "INVALID_REQUEST"
    | "TIMEOUT"
    | "INTERNAL_ERROR"
    | "TOOL_EXECUTION_FAILED"
    | "VALIDATION_ERROR"
    | "NETWORK_ERROR"
    | "STORAGE_ERROR";

// ============================================================================
// Base Error Class
// ============================================================================

export class AppError extends Error {
    constructor(
        public override message: string,
        public statusCode: number = 500,
        public code: AppErrorCode = "INTERNAL_ERROR",
        public retryable: boolean = false,
        public retryAfterMs?: number
    ) {
        super(message);
        this.name = "AppError";
    }

    toJSON() {
        return {
            error: this.message,
            code: this.code,
            statusCode: this.statusCode,
            retryable: this.retryable,
            retryAfterMs: this.retryAfterMs
        };
    }
}

// ============================================================================
// Specific Error Types
// ============================================================================

export class RateLimitError extends AppError {
    constructor(retryAfter: number = 60) {
        super(
            `Too many requests. Please wait ${retryAfter}s.`,
            429,
            "RATE_LIMITED",
            true,
            retryAfter * 1000
        );
        this.name = "RateLimitError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public field?: string) {
        super(message, 400, "VALIDATION_ERROR", false);
        this.name = "ValidationError";
    }
}

export class TimeoutError extends AppError {
    constructor(message: string = "Request timed out") {
        super(message, 408, "TIMEOUT", true, 5000);
        this.name = "TimeoutError";
    }
}

export class ToolExecutionError extends AppError {
    constructor(toolName: string, originalError: string) {
        super(
            `Tool '${toolName}' failed: ${originalError}`,
            500,
            "TOOL_EXECUTION_FAILED",
            true
        );
        this.name = "ToolExecutionError";
    }
}

export class NetworkError extends AppError {
    constructor(message: string = "Network connection failed") {
        super(message, 503, "NETWORK_ERROR", true, 3000);
        this.name = "NetworkError";
    }
}

export class StorageError extends AppError {
    constructor(message: string = "Storage operation failed") {
        super(message, 500, "STORAGE_ERROR", false);
        this.name = "StorageError";
    }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
    if (error instanceof AppError) {
        return error.retryable;
    }
    return false;
}

/**
 * Get retry delay from an error
 */
export function getRetryDelay(error: unknown, attempt: number = 1): number {
    if (error instanceof AppError && error.retryAfterMs) {
        return error.retryAfterMs;
    }
    // Exponential backoff with max 30s
    return Math.min(1000 * Math.pow(2, attempt), 30000);
}

/**
 * Classify an error from Gemini API response
 */
export function classifyGeminiError(error: unknown): AppError {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("safety") || lowerMessage.includes("blocked")) {
        return new AppError(
            "Response blocked by safety filters",
            400,
            "SAFETY_BLOCKED",
            false
        );
    }

    if (lowerMessage.includes("quota") || lowerMessage.includes("429") || lowerMessage.includes("rate")) {
        return new RateLimitError(60);
    }

    if (lowerMessage.includes("timeout") || lowerMessage.includes("deadline")) {
        return new TimeoutError();
    }

    if (lowerMessage.includes("invalid") || lowerMessage.includes("bad request")) {
        return new ValidationError(message);
    }

    if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
        return new NetworkError(message);
    }

    return new AppError(message, 500, "INTERNAL_ERROR", true);
}

/**
 * Handle an error and return a standardized response object
 */
export function handleError(error: unknown) {
    const appError = error instanceof AppError
        ? error
        : classifyGeminiError(error);

    console.error(`[Error] ${appError.code}:`, appError.message);

    return {
        error: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        retryable: appError.retryable
    };
}
