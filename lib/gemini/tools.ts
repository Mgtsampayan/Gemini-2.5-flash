/**
 * Gemini Function Calling Tools
 * 
 * Powerful tools that Gemini can call to perform real-world actions.
 * Each tool has a definition and a handler function.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolHandler, ToolRegistry, ToolExecutionResult } from "./types";

// ============================================================================
// Tool Definitions (Using SDK Types Directly)
// ============================================================================

const calculateTool: FunctionDeclaration = {
    name: "calculate",
    description: "Perform mathematical calculations. Supports basic arithmetic, percentages, exponents, square roots, trigonometry (sin, cos, tan), logarithms, and more. Use this for ANY math calculation to ensure accuracy.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            expression: {
                type: SchemaType.STRING,
                description: "The mathematical expression to evaluate, e.g., '15% of 847', '2^10', 'sqrt(144)', 'sin(45)', 'log(100)'"
            }
        },
        required: ["expression"]
    }
};

const getDateTimeTool: FunctionDeclaration = {
    name: "get_current_datetime",
    description: "Get the current date, time, day of week, or perform date calculations. Use this whenever the user asks about current time, date, or time-related questions.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            timezone: {
                type: SchemaType.STRING,
                description: "IANA timezone name, e.g., 'Asia/Manila', 'America/New_York', 'Europe/London'. Default is UTC."
            },
            format: {
                type: SchemaType.STRING,
                description: "Output format preference: full, date_only, time_only, iso8601, relative"
            }
        },
        required: []
    }
};

const generateRandomTool: FunctionDeclaration = {
    name: "generate_random",
    description: "Generate random numbers, UUIDs, passwords, or pick random items from a list. Use for any randomization needs.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            type: {
                type: SchemaType.STRING,
                description: "Type of random generation: number, uuid, password, choice, shuffle"
            },
            min: {
                type: SchemaType.NUMBER,
                description: "Minimum value for number generation"
            },
            max: {
                type: SchemaType.NUMBER,
                description: "Maximum value for number generation"
            },
            items: {
                type: SchemaType.STRING,
                description: "Comma-separated items for choice/shuffle operations"
            },
            length: {
                type: SchemaType.NUMBER,
                description: "Length for password generation (default: 16)"
            }
        },
        required: ["type"]
    }
};

const convertUnitsTool: FunctionDeclaration = {
    name: "convert_units",
    description: "Convert between units of measurement: length, weight, temperature, volume, area, speed, data sizes, currency (approximate), and more.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            value: {
                type: SchemaType.NUMBER,
                description: "The numeric value to convert"
            },
            from_unit: {
                type: SchemaType.STRING,
                description: "Source unit (e.g., 'km', 'miles', 'celsius', 'kg', 'GB')"
            },
            to_unit: {
                type: SchemaType.STRING,
                description: "Target unit (e.g., 'meters', 'feet', 'fahrenheit', 'lb', 'MB')"
            }
        },
        required: ["value", "from_unit", "to_unit"]
    }
};

const analyzeTextTool: FunctionDeclaration = {
    name: "analyze_text",
    description: "Analyze text for statistics: word count, character count, sentence count, reading time, most frequent words, and language detection.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            text: {
                type: SchemaType.STRING,
                description: "The text to analyze"
            },
            analysis_type: {
                type: SchemaType.STRING,
                description: "Type of analysis: full, word_count, reading_time, frequency, summary"
            }
        },
        required: ["text"]
    }
};

const encodeDecodeTool: FunctionDeclaration = {
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

// ============================================================================
// Tool Handlers
// ============================================================================

const handleCalculate: ToolHandler = async (args) => {
    try {
        const expression = String(args.expression || "");

        // Sanitize and normalize expression
        let sanitized = expression
            .toLowerCase()
            .replace(/\s+/g, "")
            // Handle natural language patterns
            .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, "($1/100)*$2")
            .replace(/(\d+(?:\.\d+)?)\s*percent\s*of\s*(\d+(?:\.\d+)?)/gi, "($1/100)*$2")
            .replace(/sqrt\(([^)]+)\)/g, "Math.sqrt($1)")
            .replace(/cbrt\(([^)]+)\)/g, "Math.cbrt($1)")
            .replace(/abs\(([^)]+)\)/g, "Math.abs($1)")
            .replace(/sin\(([^)]+)\)/g, "Math.sin($1*Math.PI/180)")
            .replace(/cos\(([^)]+)\)/g, "Math.cos($1*Math.PI/180)")
            .replace(/tan\(([^)]+)\)/g, "Math.tan($1*Math.PI/180)")
            .replace(/log\(([^)]+)\)/g, "Math.log10($1)")
            .replace(/ln\(([^)]+)\)/g, "Math.log($1)")
            .replace(/exp\(([^)]+)\)/g, "Math.exp($1)")
            .replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g, "Math.pow($1,$2)")
            .replace(/pi/g, "Math.PI")
            .replace(/e(?![xp])/g, "Math.E")
            .replace(/floor\(([^)]+)\)/g, "Math.floor($1)")
            .replace(/ceil\(([^)]+)\)/g, "Math.ceil($1)")
            .replace(/round\(([^)]+)\)/g, "Math.round($1)");

        // Security: only allow safe characters
        if (!/^[0-9+\-*/().%,\s\w]+$/.test(sanitized.replace(/Math\.\w+/g, ""))) {
            throw new Error("Invalid characters in expression");
        }

        // Evaluate using Function constructor (safer than eval)
        const compute = new Function(`"use strict"; return (${sanitized});`);
        const result = compute();

        if (typeof result !== "number" || !isFinite(result)) {
            throw new Error("Calculation resulted in invalid number");
        }

        // Format result nicely
        const formatted = Number.isInteger(result)
            ? result.toString()
            : result.toFixed(10).replace(/\.?0+$/, "");

        return {
            success: true,
            result: {
                expression: args.expression,
                result: formatted,
                numericValue: result
            }
        };
    } catch (error) {
        return {
            success: false,
            result: null,
            error: `Calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        };
    }
};

const handleGetDateTime: ToolHandler = async (args) => {
    try {
        const timezone = String(args.timezone || "UTC");
        const format = String(args.format || "full");

        const now = new Date();

        // Create formatter with timezone
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZoneName: "short"
        };

        const formatter = new Intl.DateTimeFormat("en-US", options);
        const parts = formatter.formatToParts(now);

        const partsMap: Record<string, string> = {};
        parts.forEach(p => { partsMap[p.type] = p.value; });

        let result: Record<string, unknown>;

        switch (format) {
            case "date_only":
                result = {
                    date: `${partsMap.month} ${partsMap.day}, ${partsMap.year}`,
                    weekday: partsMap.weekday,
                    timezone
                };
                break;
            case "time_only":
                result = {
                    time: `${partsMap.hour}:${partsMap.minute}:${partsMap.second} ${partsMap.dayPeriod}`,
                    timezone,
                    timeZoneName: partsMap.timeZoneName
                };
                break;
            case "iso8601":
                result = {
                    iso: now.toISOString(),
                    timezone
                };
                break;
            default:
                result = {
                    datetime: formatter.format(now),
                    date: `${partsMap.month} ${partsMap.day}, ${partsMap.year}`,
                    time: `${partsMap.hour}:${partsMap.minute}:${partsMap.second} ${partsMap.dayPeriod}`,
                    weekday: partsMap.weekday,
                    timezone,
                    timeZoneName: partsMap.timeZoneName,
                    unixTimestamp: Math.floor(now.getTime() / 1000)
                };
        }

        return { success: true, result };
    } catch (error) {
        return {
            success: false,
            result: null,
            error: `DateTime failed: ${error instanceof Error ? error.message : "Invalid timezone"}`
        };
    }
};

const handleGenerateRandom: ToolHandler = async (args) => {
    try {
        const type = String(args.type);

        switch (type) {
            case "number": {
                const min = Number(args.min ?? 1);
                const max = Number(args.max ?? 100);
                const result = Math.floor(Math.random() * (max - min + 1)) + min;
                return { success: true, result: { type: "number", value: result, range: { min, max } } };
            }
            case "uuid": {
                const uuid = crypto.randomUUID();
                return { success: true, result: { type: "uuid", value: uuid } };
            }
            case "password": {
                const length = Number(args.length ?? 16);
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                let password = "";
                for (let i = 0; i < length; i++) {
                    password += chars[Math.floor(Math.random() * chars.length)];
                }
                return { success: true, result: { type: "password", value: password, length } };
            }
            case "choice": {
                const items = String(args.items || "").split(",").map(s => s.trim()).filter(Boolean);
                if (items.length === 0) throw new Error("No items provided");
                const choice = items[Math.floor(Math.random() * items.length)];
                return { success: true, result: { type: "choice", value: choice, from: items } };
            }
            case "shuffle": {
                const items = String(args.items || "").split(",").map(s => s.trim()).filter(Boolean);
                const shuffled = [...items].sort(() => Math.random() - 0.5);
                return { success: true, result: { type: "shuffle", value: shuffled, original: items } };
            }
            default:
                throw new Error(`Unknown random type: ${type}`);
        }
    } catch (error) {
        return { success: false, result: null, error: error instanceof Error ? error.message : "Random generation failed" };
    }
};

const handleConvertUnits: ToolHandler = async (args) => {
    try {
        const value = Number(args.value);
        const from = String(args.from_unit).toLowerCase();
        const to = String(args.to_unit).toLowerCase();

        // Conversion factors to base units
        const conversions: Record<string, Record<string, number>> = {
            // Length (base: meters)
            length: {
                m: 1, meter: 1, meters: 1,
                km: 1000, kilometer: 1000, kilometers: 1000,
                cm: 0.01, centimeter: 0.01, centimeters: 0.01,
                mm: 0.001, millimeter: 0.001, millimeters: 0.001,
                mi: 1609.344, mile: 1609.344, miles: 1609.344,
                ft: 0.3048, foot: 0.3048, feet: 0.3048,
                in: 0.0254, inch: 0.0254, inches: 0.0254,
                yd: 0.9144, yard: 0.9144, yards: 0.9144,
            },
            // Weight (base: grams)
            weight: {
                g: 1, gram: 1, grams: 1,
                kg: 1000, kilogram: 1000, kilograms: 1000,
                mg: 0.001, milligram: 0.001, milligrams: 0.001,
                lb: 453.592, pound: 453.592, pounds: 453.592,
                oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
                ton: 907185, tons: 907185,
            },
            // Data (base: bytes)
            data: {
                b: 1, byte: 1, bytes: 1,
                kb: 1024, kilobyte: 1024, kilobytes: 1024,
                mb: 1048576, megabyte: 1048576, megabytes: 1048576,
                gb: 1073741824, gigabyte: 1073741824, gigabytes: 1073741824,
                tb: 1099511627776, terabyte: 1099511627776, terabytes: 1099511627776,
            }
        };

        // Temperature is special
        if (["c", "f", "k", "celsius", "fahrenheit", "kelvin"].includes(from) ||
            ["c", "f", "k", "celsius", "fahrenheit", "kelvin"].includes(to)) {
            const fromNorm = from.charAt(0);
            const toNorm = to.charAt(0);

            // Convert to Celsius first
            let celsius: number;
            if (fromNorm === "c") celsius = value;
            else if (fromNorm === "f") celsius = (value - 32) * 5 / 9;
            else if (fromNorm === "k") celsius = value - 273.15;
            else throw new Error(`Unknown temperature unit: ${from}`);

            // Convert from Celsius to target
            let result: number;
            if (toNorm === "c") result = celsius;
            else if (toNorm === "f") result = celsius * 9 / 5 + 32;
            else if (toNorm === "k") result = celsius + 273.15;
            else throw new Error(`Unknown temperature unit: ${to}`);

            return {
                success: true,
                result: {
                    from: { value, unit: from },
                    to: { value: Math.round(result * 1000) / 1000, unit: to },
                    formula: getTemperatureFormula(fromNorm, toNorm)
                }
            };
        }

        // Find the conversion category
        let category: Record<string, number> | null = null;
        for (const cat of Object.values(conversions)) {
            if (cat[from] !== undefined && cat[to] !== undefined) {
                category = cat;
                break;
            }
        }

        if (!category) {
            throw new Error(`Cannot convert between ${from} and ${to}`);
        }

        const fromFactor = category[from];
        const toFactor = category[to];

        if (fromFactor === undefined || toFactor === undefined) {
            throw new Error(`Cannot convert between ${from} and ${to}`);
        }

        const baseValue = value * fromFactor;
        const result = baseValue / toFactor;

        return {
            success: true,
            result: {
                from: { value, unit: from },
                to: { value: Math.round(result * 1000000) / 1000000, unit: to }
            }
        };
    } catch (error) {
        return { success: false, result: null, error: error instanceof Error ? error.message : "Conversion failed" };
    }
};

function getTemperatureFormula(from: string, to: string): string {
    const formulas: Record<string, string> = {
        "cf": "°F = °C × 9/5 + 32",
        "fc": "°C = (°F - 32) × 5/9",
        "ck": "K = °C + 273.15",
        "kc": "°C = K - 273.15",
        "fk": "K = (°F - 32) × 5/9 + 273.15",
        "kf": "°F = (K - 273.15) × 9/5 + 32",
    };
    return formulas[from + to] || "";
}

const handleAnalyzeText: ToolHandler = async (args) => {
    try {
        const text = String(args.text || "");
        const analysisType = String(args.analysis_type || "full");

        const words = text.trim().split(/\s+/).filter(Boolean);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

        // Word frequency (top 10)
        const wordFreq: Record<string, number> = {};
        words.forEach(w => {
            const word = w.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (word.length > 2) { // Skip short words
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });
        const topWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        // Reading time (avg 200 wpm)
        const readingTimeMinutes = Math.ceil(words.length / 200);

        const fullResult = {
            characters: text.length,
            charactersNoSpaces: text.replace(/\s/g, "").length,
            words: words.length,
            sentences: sentences.length,
            paragraphs: paragraphs.length,
            averageWordLength: words.length > 0 ? Math.round(words.join("").length / words.length * 10) / 10 : 0,
            averageSentenceLength: sentences.length > 0 ? Math.round(words.length / sentences.length * 10) / 10 : 0,
            readingTime: `${readingTimeMinutes} minute${readingTimeMinutes !== 1 ? "s" : ""}`,
            topWords
        };

        let result: object;
        switch (analysisType) {
            case "word_count":
                result = { words: words.length, characters: text.length };
                break;
            case "reading_time":
                result = { readingTime: fullResult.readingTime, wordCount: words.length };
                break;
            case "frequency":
                result = { topWords };
                break;
            default:
                result = fullResult;
        }

        return { success: true, result };
    } catch (error) {
        return { success: false, result: null, error: error instanceof Error ? error.message : "Analysis failed" };
    }
};

const handleEncodeDecode: ToolHandler = async (args) => {
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
                    const morseMap: Record<string, string> = {
                        "a": ".-", "b": "-...", "c": "-.-.", "d": "-..", "e": ".", "f": "..-.",
                        "g": "--.", "h": "....", "i": "..", "j": ".---", "k": "-.-", "l": ".-..",
                        "m": "--", "n": "-.", "o": "---", "p": ".--.", "q": "--.-", "r": ".-.",
                        "s": "...", "t": "-", "u": "..-", "v": "...-", "w": ".--", "x": "-..-",
                        "y": "-.--", "z": "--..", " ": "/", "1": ".----", "2": "..---",
                        "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...",
                        "8": "---..", "9": "----.", "0": "-----"
                    };
                    result = text.toLowerCase().split("").map(c => morseMap[c] || c).join(" ");
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

// ============================================================================
// Tool Registry Export
// ============================================================================

const toolDefinitions: FunctionDeclaration[] = [
    calculateTool,
    getDateTimeTool,
    generateRandomTool,
    convertUnitsTool,
    analyzeTextTool,
    encodeDecodeTool
];

export const toolRegistry: ToolRegistry = {
    definitions: toolDefinitions,
    handlers: {
        calculate: handleCalculate,
        get_current_datetime: handleGetDateTime,
        generate_random: handleGenerateRandom,
        convert_units: handleConvertUnits,
        analyze_text: handleAnalyzeText,
        encode_decode: handleEncodeDecode
    }
};

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(
    toolName: string,
    args: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const handler = toolRegistry.handlers[toolName];

    if (!handler) {
        return {
            success: false,
            result: null,
            error: `Unknown tool: ${toolName}`
        };
    }

    console.log(`[Tool] Executing: ${toolName}`, args);
    const startTime = Date.now();

    const result = await handler(args);

    console.log(`[Tool] ${toolName} completed in ${Date.now() - startTime}ms`,
        result.success ? "✓" : "✗");

    return result;
}

/**
 * Get tool definitions in Gemini SDK format
 */
export function getToolDeclarations() {
    return {
        functionDeclarations: toolDefinitions
    };
}
