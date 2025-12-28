/**
 * Encode/Decode Tool
 * 
 * Encode and decode text in various formats.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolModule, ToolExecutionResult } from "./types";

export const declaration: FunctionDeclaration = {
    name: "encode_decode",
    description: "Encode or decode text using various formats: Base64, URL encoding, HTML entities, ROT13, Morse code, Binary.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            text: {
                type: SchemaType.STRING,
                description: "The text to encode or decode"
            },
            operation: {
                type: SchemaType.STRING,
                description: "Whether to encode or decode"
            },
            format: {
                type: SchemaType.STRING,
                description: "The encoding format: base64, url, html, rot13, morse, binary"
            }
        },
        required: ["text", "operation", "format"]
    }
};

const MORSE_MAP: Record<string, string> = {
    "a": ".-", "b": "-...", "c": "-.-.", "d": "-..", "e": ".", "f": "..-.",
    "g": "--.", "h": "....", "i": "..", "j": ".---", "k": "-.-", "l": ".-..",
    "m": "--", "n": "-.", "o": "---", "p": ".--.", "q": "--.-", "r": ".-.",
    "s": "...", "t": "-", "u": "..-", "v": "...-", "w": ".--", "x": "-..-",
    "y": "-.--", "z": "--..", " ": "/", "1": ".----", "2": "..---",
    "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...",
    "8": "---..", "9": "----.", "0": "-----"
};

export const handler = async (args: Record<string, unknown>): Promise<ToolExecutionResult> => {
    try {
        const text = String(args.text || "");
        const operation = String(args.operation);
        const format = String(args.format);

        let result: string;

        if (operation === "encode") {
            switch (format) {
                case "base64":
                    result = Buffer.from(text).toString("base64");
                    break;
                case "url":
                    result = encodeURIComponent(text);
                    break;
                case "html":
                    result = text.replace(/[&<>"']/g, c =>
                        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c] || c);
                    break;
                case "rot13":
                    result = text.replace(/[a-zA-Z]/g, c =>
                        String.fromCharCode((c.charCodeAt(0) + 13 - (c.toLowerCase() < "n" ? 0 : 26))));
                    break;
                case "binary":
                    result = text.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
                    break;
                case "morse":
                    result = text.toLowerCase().split("").map(c => MORSE_MAP[c] || c).join(" ");
                    break;
                default:
                    throw new Error(`Unknown format: ${format}`);
            }
        } else {
            // Decode
            switch (format) {
                case "base64":
                    result = Buffer.from(text, "base64").toString("utf-8");
                    break;
                case "url":
                    result = decodeURIComponent(text);
                    break;
                case "html":
                    result = text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m =>
                        ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" })[m] || m);
                    break;
                case "rot13":
                    result = text.replace(/[a-zA-Z]/g, c =>
                        String.fromCharCode((c.charCodeAt(0) + 13 - (c.toLowerCase() < "n" ? 0 : 26))));
                    break;
                case "binary":
                    result = text.split(" ").map(b => String.fromCharCode(parseInt(b, 2))).join("");
                    break;
                default:
                    throw new Error(`Decoding not supported for: ${format}`);
            }
        }

        return { success: true, result: { input: text, output: result, operation, format } };
    } catch (error) {
        return { success: false, result: null, error: error instanceof Error ? error.message : "Encode/decode failed" };
    }
};

const encodeTool: ToolModule = { declaration, handler };
export default encodeTool;
