/**
 * Token Estimation Web Worker
 * 
 * Offloads token counting to a separate thread to avoid
 * blocking the main UI during large text processing.
 */

const CHARS_PER_TOKEN = 4;

/**
 * Estimate tokens for text
 */
function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate tokens for an array of messages
 */
function estimateMessagesTokens(messages: Array<{ text: string }>): number {
    return messages.reduce((total, msg) => {
        return total + estimateTokens(msg.text || "") + 10; // +10 for overhead
    }, 0);
}

// Listen for messages from main thread
self.onmessage = (event: MessageEvent) => {
    const { type, data, id } = event.data;

    try {
        let result: unknown;

        switch (type) {
            case "estimateTokens":
                result = estimateTokens(data.text);
                break;

            case "estimateMessagesTokens":
                result = estimateMessagesTokens(data.messages);
                break;

            case "trimHistory":
                const maxTokens = data.maxTokens || 8000;
                const history = data.history || [];
                let totalTokens = 0;
                const trimmed: typeof history = [];

                for (let i = history.length - 1; i >= 0; i--) {
                    const msg = history[i];
                    const text = msg.parts?.map((p: { text?: string }) => p.text || "").join(" ") || "";
                    const tokens = estimateTokens(text) + 10;

                    if (totalTokens + tokens > maxTokens) break;

                    totalTokens += tokens;
                    trimmed.unshift(msg);
                }

                result = trimmed;
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }

        self.postMessage({ id, result, error: null });
    } catch (error) {
        self.postMessage({
            id,
            result: null,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Export empty object for TypeScript
export { };
