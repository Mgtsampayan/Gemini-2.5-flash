/**
 * Input Sanitization (Simple)
 * 
 * Basic input cleaning + injection detection logging.
 */

const MAX_MESSAGE_LENGTH = 10000;

// Core injection patterns to detect (not block)
const INJECTION_PATTERNS = [
    /ignore.*previous.*instructions/i,
    /you.*are.*now/i,
    /system\s*:/i,
    /\[INST\]/i,
    /forget.*everything/i,
];

/**
 * Check if message contains suspicious patterns
 */
export function detectInjection(message: string): boolean {
    return INJECTION_PATTERNS.some(p => p.test(message));
}

/**
 * Sanitize user message before sending to AI
 */
export function sanitizeMessage(message: string): string {
    // Trim and limit length
    let clean = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    // Remove null bytes and control characters (keep newlines/tabs)
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Normalize excessive whitespace
    clean = clean.replace(/\n{4,}/g, "\n\n\n");
    clean = clean.replace(/ {6,}/g, "     ");

    return clean;
}

/**
 * Escape HTML entities for safe display
 */
export function escapeHtml(text: string): string {
    const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (c) => entities[c] || c);
}
