export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code: string = "INTERNAL_ERROR"
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class RateLimitError extends AppError {
    constructor(retryAfter: number) {
        super(`Too many requests. Please wait ${retryAfter}s.`, 429, "RATE_LIMITED");
        this.name = "RateLimitError";
    }
}
