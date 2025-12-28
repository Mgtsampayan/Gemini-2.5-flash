import { NextResponse } from "next/server";
import { ChatService } from "@/lib/chat/service";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
    try {
        // Validate content type
        if (!request.headers.get("content-type")?.includes("application/json")) {
            throw new AppError("Content-Type must be application/json", 415, "INVALID_CONTENT_TYPE");
        }

        // Parse body
        const body = await request.json().catch(() => {
            throw new AppError("Invalid JSON", 400, "INVALID_JSON");
        });

        // Delegate to Service Layer
        const result = await ChatService.processRequest({
            userId: typeof body.userId === "string" ? body.userId.trim() : "",
            message: typeof body.message === "string" ? body.message.trim() : "",
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
            history: Array.isArray(body.history) ? body.history : [],
            stream: body.stream !== false,
            responseFormat: body.responseFormat === "json" ? "json" : "text",
        });

        // Return Response (Stream or JSON)
        if (result instanceof Response) {
            return result;
        }

        return NextResponse.json(result);

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        const status = error instanceof AppError ? error.statusCode : 500;
        const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";

        if (status === 500) {
            console.error(`[API Error] ${code}:`, error);
        } else {
            console.warn(`[API Error] ${code}:`, message);
        }

        return NextResponse.json(
            { error: message, code },
            { status }
        );
    }
}
