/**
 * Token Utilities (Simple)
 * 
 * Estimates tokens and trims history to prevent context overflow.
 * Rule of thumb: ~4 characters = 1 token for English text.
 */

const CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_TOKENS = 8000;

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Trim history to fit within token budget
 * Keeps recent messages, removes oldest first
 */
export function trimHistoryByTokens(
    history: Array<{ role: string; parts: Array<{ text: string }> }>,
    maxTokens = DEFAULT_MAX_TOKENS
): Array<{ role: string; parts: Array<{ text: string }> }> {
    if (!history || history.length === 0) return [];

    let totalTokens = 0;
    const result: typeof history = [];

    // Work backwards from most recent
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (!msg) continue;

        const text = msg.parts.map(p => p.text).join(" ");
        const tokens = estimateTokens(text) + 10; // +10 for message overhead

        if (totalTokens + tokens > maxTokens) break;

        totalTokens += tokens;
        result.unshift(msg);
    }

    return result;
}
