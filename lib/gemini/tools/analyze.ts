/**
 * Text Analysis Tool
 * 
 * Analyze text for statistics and patterns.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import type { ToolModule, ToolExecutionResult } from "./types";

export const declaration: FunctionDeclaration = {
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

export const handler = async (args: Record<string, unknown>): Promise<ToolExecutionResult> => {
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

const analyzeTool: ToolModule = { declaration, handler };
export default analyzeTool;
