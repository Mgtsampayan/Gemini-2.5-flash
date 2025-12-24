/**
 * Gemini System Prompts & Intent Detection
 * 
 * Advanced prompts and intent classification for optimal response quality.
 */

import type { IntentType, IntentConfig, INTENT_CONFIGS } from "./types";

// ============================================================================
// System Instructions
// ============================================================================

export const SYSTEM_INSTRUCTION = `You are GemBot, a highly intelligent AI assistant powered by Google Gemini 3 Flash Preview—one of the most advanced language models available. You combine deep knowledge, precise reasoning, and creative capabilities to help users with any task.

## Core Capabilities

### 🧮 **Mathematics & Science**
You have access to a \`calculate\` tool for precise math operations. ALWAYS use it for:
- Arithmetic, percentages, fractions
- Algebra and calculus expressions  
- Trigonometry (degrees), logarithms, roots
- Statistics and probability

### 🕐 **Date & Time**
Use the \`get_current_datetime\` tool when asked about:
- Current time in any timezone
- Today's date, day of week
- Time differences between zones

### 🔄 **Unit Conversion**
Use \`convert_units\` for any conversion between:
- Length (km, miles, feet, meters)
- Weight (kg, lbs, oz, grams)
- Temperature (Celsius, Fahrenheit, Kelvin)
- Data sizes (KB, MB, GB, TB)

### 🎲 **Randomization**
Use \`generate_random\` for:
- Random numbers in a range
- UUID generation
- Secure password generation
- Picking from a list of items

### 📝 **Text Analysis**
Use \`analyze_text\` when asked to:
- Count words/characters
- Calculate reading time
- Find most frequent words

### 🔐 **Encoding/Decoding**
Use \`encode_decode\` for:
- Base64, URL encoding
- Binary, Morse code
- ROT13 cipher

## Response Guidelines

### Tool Usage
1. **Always use tools when relevant** - Don't calculate manually, use the tool
2. **Call tools BEFORE responding** - Get the data first, then explain
3. **Handle tool errors gracefully** - If a tool fails, explain why

### Response Quality
1. **Be direct and concise** - No fluff, get to the point
2. **Use markdown formatting** - Headers, lists, code blocks for clarity  
3. **Show your reasoning** - For complex problems, explain your approach
4. **Provide examples** - Especially for technical concepts

### Accuracy
1. **Admit uncertainty** - Say "I'm not sure" rather than guess
2. **Cite limitations** - Note when information might be outdated
3. **Correct mistakes** - If you realize an error, acknowledge it

## What You Don't Do
- ❌ Provide medical/legal/financial advice requiring professionals
- ❌ Generate harmful, illegal, or unethical content
- ❌ Pretend to have real-time internet access (unless Grounding is enabled)
- ❌ Make up facts or citations

## Personality
- Helpful but not subservient
- Confident but not arrogant  
- Technical when needed, simple when possible
- A dash of wit when appropriate`;

// ============================================================================
// Intent Detection
// ============================================================================

/**
 * Keywords and patterns for detecting user intent
 */
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
    math: [
        /\b(calculate|compute|solve|equation|formula|math)\b/i,
        /\b(what is|what's)\s+\d/i,
        /\b\d+\s*[+\-*/^%]\s*\d+/,
        /\b(sum|difference|product|quotient|remainder)\b/i,
        /\b(percent|percentage|%)\b/i,
        /\b(square root|sqrt|cube root|factorial)\b/i,
        /\b(sin|cos|tan|log|ln)\s*\(/i,
        /\b(average|mean|median|mode|standard deviation)\b/i,
        /how (much|many)/i,
    ],
    code: [
        /\b(code|programming|function|class|method|variable)\b/i,
        /\b(javascript|typescript|python|java|c\+\+|rust|go)\b/i,
        /\b(debug|fix|error|bug|compile|runtime)\b/i,
        /\b(api|rest|graphql|http|json|xml)\b/i,
        /\b(database|sql|postgres|mysql|mongodb)\b/i,
        /\b(react|vue|angular|nextjs|node)\b/i,
        /\b(git|github|commit|merge|branch)\b/i,
        /```[\s\S]*```/,
        /\b(algorithm|data structure|complexity)\b/i,
    ],
    creative: [
        /\b(write|compose|create|generate)\s+(a|an|the)?\s*(story|poem|haiku|song|lyrics)\b/i,
        /\b(creative|imaginative|artistic)\b/i,
        /\b(brainstorm|ideas|suggestions|inspire)\b/i,
        /\b(slogan|tagline|headline|title)\b/i,
        /\b(joke|funny|humor|pun)\b/i,
        /\b(describe|paint a picture|imagine)\b/i,
        /what if/i,
    ],
    factual: [
        /\b(what is|what are|who is|who was|when did|where is)\b/i,
        /\b(define|definition|meaning of)\b/i,
        /\b(explain|describe|tell me about)\b/i,
        /\b(history|origin|etymology)\b/i,
        /\b(fact|true|false|myth)\b/i,
        /\b(capital of|population of|president of)\b/i,
    ],
    analysis: [
        /\b(analyze|analysis|evaluate|assessment|review)\b/i,
        /\b(compare|comparison|versus|vs\.?|differ)\b/i,
        /\b(pros and cons|advantages|disadvantages)\b/i,
        /\b(best|worst|top|rank|rating)\b/i,
        /\b(trend|pattern|insight|data)\b/i,
        /\b(summary|summarize|overview)\b/i,
    ],
    general: [] // Default fallback
};

/**
 * Detect the intent of a user message
 */
export function detectIntent(message: string): IntentType {
    // Check each intent type in priority order
    const priorityOrder: IntentType[] = ["math", "code", "creative", "analysis", "factual", "general"];

    for (const intent of priorityOrder) {
        const patterns = INTENT_PATTERNS[intent];
        if (patterns.some(pattern => pattern.test(message))) {
            return intent;
        }
    }

    return "general";
}

/**
 * Get generation config based on detected intent
 */
export function getConfigForIntent(intent: IntentType): IntentConfig {
    const configs: Record<IntentType, IntentConfig> = {
        math: {
            temperature: 0.1,
            topP: 0.8,
            topK: 20,
            description: "Precise mathematical calculations"
        },
        code: {
            temperature: 0.2,
            topP: 0.85,
            topK: 30,
            description: "Code generation and debugging"
        },
        factual: {
            temperature: 0.3,
            topP: 0.9,
            topK: 35,
            description: "Factual information retrieval"
        },
        analysis: {
            temperature: 0.4,
            topP: 0.9,
            topK: 40,
            description: "Data analysis and comparisons"
        },
        general: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            description: "General conversation"
        },
        creative: {
            temperature: 0.9,
            topP: 0.98,
            topK: 50,
            description: "Creative writing and brainstorming"
        }
    };

    return configs[intent];
}

// ============================================================================
// Structured Output Schemas
// ============================================================================

export const OUTPUT_SCHEMAS = {
    /**
     * For list/array responses
     */
    list: {
        type: "object",
        properties: {
            items: {
                type: "array",
                items: { type: "string" }
            },
            count: { type: "number" }
        },
        required: ["items", "count"]
    },

    /**
     * For step-by-step explanations
     */
    steps: {
        type: "object",
        properties: {
            title: { type: "string" },
            steps: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        number: { type: "number" },
                        action: { type: "string" },
                        explanation: { type: "string" }
                    }
                }
            },
            finalResult: { type: "string" }
        }
    },

    /**
     * For comparison responses
     */
    comparison: {
        type: "object",
        properties: {
            subject1: { type: "string" },
            subject2: { type: "string" },
            similarities: {
                type: "array",
                items: { type: "string" }
            },
            differences: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        aspect: { type: "string" },
                        value1: { type: "string" },
                        value2: { type: "string" }
                    }
                }
            },
            recommendation: { type: "string" }
        }
    }
} as const;
