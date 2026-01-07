/**
 * Token Worker Client
 * 
 * Provides async interface to the token estimation web worker.
 */

type WorkerMessageType = "estimateTokens" | "estimateMessagesTokens" | "trimHistory";

interface WorkerRequest {
    type: WorkerMessageType;
    data: Record<string, unknown>;
}

interface WorkerResponse<T> {
    id: string;
    result: T | null;
    error: string | null;
}

class TokenWorkerClient {
    private worker: Worker | null = null;
    private pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
    private nextId = 0;

    /**
     * Initialize the worker
     */
    private getWorker(): Worker {
        if (this.worker) return this.worker;

        // Create worker from blob for Next.js compatibility
        const workerCode = `
            const CHARS_PER_TOKEN = 4;
            
            function estimateTokens(text) {
                if (!text) return 0;
                return Math.ceil(text.length / CHARS_PER_TOKEN);
            }
            
            self.onmessage = (event) => {
                const { type, data, id } = event.data;
                try {
                    let result;
                    if (type === "estimateTokens") {
                        result = estimateTokens(data.text);
                    } else if (type === "estimateMessagesTokens") {
                        result = data.messages.reduce((total, msg) => {
                            return total + estimateTokens(msg.text || "") + 10;
                        }, 0);
                    }
                    self.postMessage({ id, result, error: null });
                } catch (error) {
                    self.postMessage({ id, result: null, error: error.message });
                }
            };
        `;

        const blob = new Blob([workerCode], { type: "application/javascript" });
        this.worker = new Worker(URL.createObjectURL(blob));

        this.worker.onmessage = (event: MessageEvent<WorkerResponse<unknown>>) => {
            const { id, result, error } = event.data;
            const pending = this.pending.get(id);

            if (pending) {
                this.pending.delete(id);
                if (error) {
                    pending.reject(new Error(error));
                } else {
                    pending.resolve(result);
                }
            }
        };

        this.worker.onerror = (error) => {
            console.error("[TokenWorker] Error:", error);
        };

        return this.worker;
    }

    /**
     * Send a message to the worker and wait for response
     */
    private async send<T>(request: WorkerRequest): Promise<T> {
        const id = String(this.nextId++);
        const worker = this.getWorker();

        return new Promise<T>((resolve, reject) => {
            this.pending.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
            });
            worker.postMessage({ ...request, id });
        });
    }

    /**
     * Estimate tokens for text (async, off main thread)
     */
    async estimateTokens(text: string): Promise<number> {
        return this.send<number>({
            type: "estimateTokens",
            data: { text },
        });
    }

    /**
     * Estimate tokens for messages array
     */
    async estimateMessagesTokens(messages: Array<{ text: string }>): Promise<number> {
        return this.send<number>({
            type: "estimateMessagesTokens",
            data: { messages },
        });
    }

    /**
     * Terminate the worker
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pending.clear();
    }
}

// Singleton instance
let tokenWorker: TokenWorkerClient | null = null;

export function getTokenWorker(): TokenWorkerClient {
    if (!tokenWorker) {
        tokenWorker = new TokenWorkerClient();
    }
    return tokenWorker;
}

export function terminateTokenWorker(): void {
    tokenWorker?.terminate();
    tokenWorker = null;
}
