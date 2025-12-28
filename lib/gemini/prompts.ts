/**
 * Gemini System Prompts & Intent Detection
 * 
 * Advanced prompts and intent classification for optimal response quality.
 */

import { INTENT_CONFIGS, RESPONSE_DEPTH_CONFIGS } from "./types";
import type { IntentType, IntentConfig, ResponseDepthType, ResponseDepthConfig } from "./types";

// ============================================================================
// System Instructions
// ============================================================================

export const SYSTEM_INSTRUCTION = `You are GemBot, a highly intelligent AI assistant powered by Google Gemini 3 Flash Preview—one of the most advanced language models available. You combine deep knowledge, precise reasoning, and creative capabilities to help users with ANY task—from the simplest to the most complex.

## CRITICAL: Answer ALL Questions

You are a **general-purpose AI assistant**. You MUST be able to answer:
- **Simple questions**: "1 + 1", "What is 2 + 2?", "Hello", basic greetings
- **Complex questions**: Integrals, code, essays, analysis
- **Everything in between**: ANY question a user might ask

**NEVER refuse or fail on simple questions.** If you can answer directly, do so. Use tools only when they genuinely help.

## Core Capabilities

### 🧮 **Mathematics & Science**
You have access to a \`calculate\` tool for complex or precise calculations.
- **For simple arithmetic** (1+1, 2*3, 10/2): You CAN answer directly OR use the tool—your choice
- **For complex calculations** (square roots, trigonometry, percentages): Prefer the \`calculate\` tool for accuracy
- **For symbolic math** (integrals, derivatives, algebra): Answer using your knowledge

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

### General Approach
1. **Always respond helpfully** - Never fail or refuse simple questions
2. **Be flexible** - Use tools when helpful, answer directly when simpler
3. **If a tool fails, answer anyway** - Use your knowledge as a fallback

### Tool Usage
1. **Tools are optional helpers** - You don't NEED them for every question
2. **Call tools BEFORE responding** - When using tools, get data first, then explain
3. **Handle tool errors gracefully** - If a tool fails, just answer from your knowledge

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
- ❌ Refuse to answer simple questions
- ❌ Fail on basic arithmetic or greetings
- ❌ Provide medical/legal/financial advice requiring professionals
- ❌ Generate harmful, illegal, or unethical content
- ❌ Pretend to have real-time internet access (unless Grounding is enabled)
- ❌ Make up facts or citations

## Response Calibration - IMPORTANT

You MUST intelligently match your response length and depth to the question's complexity. This is a critical skill.

### 🟢 BRIEF Responses (1-3 sentences max)
Use for simple, direct questions that need quick answers:
- **Greetings**: "Hi!" → "Hello! How can I help you today?"
- **Simple math**: "What is 5 + 3?" → "5 + 3 = **8**"
- **Direct facts**: "What is the capital of Japan?" → "The capital of Japan is **Tokyo**."
- **Yes/No questions**: "Is Python interpreted?" → "Yes, Python is an interpreted language."
- **Quick definitions**: "What is an API?" → "An API (Application Programming Interface) is a set of rules that allows programs to communicate with each other."
- **Time/Date queries**: Answer directly with the result.
- **Keywords**: User says "quick", "briefly", "tldr", "short answer"

### 🟡 STANDARD Responses (1-2 paragraphs)
Use for typical questions requiring some explanation:
- General "how-to" questions
- Explanations without "in detail" modifiers
- Recommendations or opinions
- Most everyday questions

### 🔵 COMPREHENSIVE Responses (Multi-section, with examples)
Use when depth is clearly needed:
- **"Explain in detail..."**, **"How does X work step by step?"**
- **Comparisons**: "Compare X vs Y", "Pros and cons of..."
- **Tutorials**: "Guide me through...", "Teach me..."
- **Analysis**: "Analyze...", "Evaluate..."
- **Code walkthroughs**: Multi-file implementations, debugging sessions
- **Keywords**: "in depth", "comprehensively", "thoroughly", "complete guide"

### ⚠️ Anti-Patterns to AVOID:
1. **Over-explaining simple questions**: Don't give a history lesson when asked "What is 2+2?"
2. **Under-delivering on complex questions**: Don't give 2 sentences when asked for a detailed tutorial
3. **Ignoring explicit cues**: If user says "briefly", keep it brief. If they say "in detail", go deep.

### Response Calibration Examples:

| User Question | Response Type | Why |
|--------------|---------------|-----|
| "Hi" | BRIEF | Simple greeting |
| "What is 10 * 5?" | BRIEF | Direct calculation |
| "What is machine learning?" | STANDARD | General explanation |
| "Explain machine learning in detail with examples" | COMPREHENSIVE | Explicit "in detail" + "with examples" |
| "Compare React vs Vue" | COMPREHENSIVE | Comparison needs thorough coverage |
| "Is TypeScript better than JavaScript?" | STANDARD | Opinion, not a deep dive |

## Personality
- Helpful but not subservient
- Confident but not arrogant  
- Technical when needed, simple when possible
- A dash of wit when appropriate
- **Efficient**: Respect the user's time by calibrating your verbosity`;

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
    // Use the single source of truth from types.ts
    return INTENT_CONFIGS[intent];
}

// ============================================================================
// Response Depth Detection
// ============================================================================

/**
 * Patterns for detecting required response depth
 */
const DEPTH_PATTERNS: Record<ResponseDepthType, RegExp[]> = {
    brief: [
        // Greetings and courtesy
        /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it|cool|nice|great|awesome)\s*[!.?]*$/i,
        // Simple arithmetic: "1+1", "what is 2+2", "5*3"
        /^(what is|what's)?\s*\d+\s*[+\-*/x×÷]\s*\d+\s*[?]?$/i,
        // Very short questions (likely simple)
        /^(is|are|does|did|can|will|was|were|has|have)\s+\w+(\s+\w+){0,3}\?$/i,
        // Explicit brevity requests
        /\b(quick|briefly|tldr|tl;dr|short answer|in short|one word|yes or no)\b/i,
        // Time/date simple queries
        /^what (time|day|date) is it\??$/i,
        // Simple factual lookups
        /^(who is|what is|where is)\s+[a-z\s]{1,25}\?$/i,
    ],
    comprehensive: [
        // Explicit depth requests
        /\b(in detail|in depth|in-depth|comprehensively|thoroughly|step[- ]by[- ]step|from scratch)\b/i,
        /\b(explain .{5,} in detail|detailed explanation|full explanation)\b/i,
        // Tutorial/Guide requests
        /\b(guide|tutorial|walkthrough|teach me|show me how|complete guide)\b/i,
        /\b(how (do|can|should) (i|we|you) .{10,})\b/i,
        // Comparison requests
        /\b(compare|versus|vs\.?|differences? between|pros and cons|advantages and disadvantages)\b/i,
        // Analysis requests
        /\b(analyze|analyse|assessment|evaluation|deep dive|comprehensive review)\b/i,
        // Multi-part requests
        /\b(and also|as well as|additionally|furthermore|moreover)\b/i,
        // Code implementation requests
        /\b(implement|implementation|build|create|develop)\s+.{10,}/i,
        /\b(full (code|implementation|example|solution))\b/i,
        // List requests implying depth
        /\b(list all|all the ways|every|everything about)\b/i,
        // Long questions (usually need thorough answers)
        // Will be handled by heuristic below
    ],
    standard: [] // Default - matched by exclusion
};

/**
 * Detect the required response depth for a user message.
 * This determines how detailed and long the response should be.
 */
export function detectResponseDepth(message: string): ResponseDepthType {
    const trimmedMessage = message.trim();

    // Check for explicit brief patterns first
    if (DEPTH_PATTERNS.brief.some(p => p.test(trimmedMessage))) {
        return "brief";
    }

    // Check for comprehensive patterns
    if (DEPTH_PATTERNS.comprehensive.some(p => p.test(trimmedMessage))) {
        return "comprehensive";
    }

    // Heuristics based on message characteristics
    const wordCount = trimmedMessage.split(/\s+/).filter(Boolean).length;
    const hasQuestionMark = trimmedMessage.endsWith("?");
    const hasMultipleSentences = (trimmedMessage.match(/[.!?]/g) || []).length > 1;
    const hasCodeBlock = /```[\s\S]*```/.test(trimmedMessage);
    const hasMultipleQuestions = (trimmedMessage.match(/\?/g) || []).length > 1;

    // Very short messages (1-4 words) are usually brief
    if (wordCount <= 4 && !hasMultipleSentences && !hasCodeBlock) {
        return "brief";
    }

    // Long messages or multiple questions suggest comprehensive needs
    if (wordCount > 30 || hasMultipleQuestions || hasCodeBlock) {
        return "comprehensive";
    }

    // Medium-length questions default to standard
    return "standard";
}

/**
 * Get the response depth configuration
 */
export function getConfigForDepth(depth: ResponseDepthType): ResponseDepthConfig {
    // Use the single source of truth from types.ts
    return RESPONSE_DEPTH_CONFIGS[depth];
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
