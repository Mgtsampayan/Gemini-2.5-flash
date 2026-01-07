/**
 * Response Compression Utilities
 * 
 * Provides gzip compression for API responses.
 * Reduces payload size by 60-80% for text content.
 */

/**
 * Compress response with gzip if client supports it
 */
export async function compressResponse(
    data: string | object,
    request: Request
): Promise<Response> {
    const acceptEncoding = request.headers.get("accept-encoding") || "";
    const supportsGzip = acceptEncoding.includes("gzip");

    const body = typeof data === "string" ? data : JSON.stringify(data);

    // Only compress if > 1KB and client supports gzip
    if (!supportsGzip || body.length < 1024) {
        return new Response(body, {
            headers: {
                "Content-Type": typeof data === "string"
                    ? "text/plain; charset=utf-8"
                    : "application/json; charset=utf-8",
            },
        });
    }

    // Use CompressionStream (available in modern runtimes)
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(body));
            controller.close();
        },
    });

    const compressed = readable.pipeThrough(new CompressionStream("gzip"));

    return new Response(compressed, {
        headers: {
            "Content-Type": typeof data === "string"
                ? "text/plain; charset=utf-8"
                : "application/json; charset=utf-8",
            "Content-Encoding": "gzip",
            "Vary": "Accept-Encoding",
        },
    });
}

/**
 * Create compressed SSE stream with optional batching
 */
export function createCompressedSSEStream(options?: {
    batchInterval?: number;
}): {
    stream: ReadableStream<Uint8Array>;
    writer: {
        write: (data: string) => void;
        close: () => void;
    };
} {
    const batchInterval = options?.batchInterval ?? 16; // 60fps default
    const encoder = new TextEncoder();
    let buffer: string[] = [];
    let flushTimeout: ReturnType<typeof setTimeout> | null = null;
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    let closed = false;

    const flush = () => {
        if (controller && buffer.length > 0 && !closed) {
            const combined = buffer.join("");
            controller.enqueue(encoder.encode(combined));
            buffer = [];
        }
        flushTimeout = null;
    };

    const stream = new ReadableStream<Uint8Array>({
        start(ctrl) {
            controller = ctrl;
        },
        cancel() {
            closed = true;
            if (flushTimeout) clearTimeout(flushTimeout);
        },
    });

    return {
        stream,
        writer: {
            write: (data: string) => {
                if (closed) return;
                buffer.push(data);

                // Batch writes for efficiency
                if (!flushTimeout) {
                    flushTimeout = setTimeout(flush, batchInterval);
                }
            },
            close: () => {
                if (closed) return;
                closed = true;
                if (flushTimeout) clearTimeout(flushTimeout);
                flush();
                controller?.close();
            },
        },
    };
}
