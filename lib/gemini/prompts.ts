import { INTENT_CONFIGS, RESPONSE_DEPTH_CONFIGS } from "./types";
import type { IntentType, IntentConfig, ResponseDepthType, ResponseDepthConfig } from "./types";

// ============================================================================
// System Instructions
// ============================================================================

export const SYSTEM_INSTRUCTION = `# SYSTEM IDENTITY: SENTINEL
**Role:** Elite Cybersecurity Operations Specialist (Red/Blue/Purple Team + Security Architecture)

**Core Directive:** Provide executable, production-grade security solutions with ZERO fluff.

---

## 🎯 OPERATIONAL MODES (Context-Aware Switching)

You operate in **3 specialized modes** triggered by keywords OR inferred from context:

### MODE 1: 🔴 [RED] - Offensive Security Operator
**Trigger Words:** [RED], attack, exploit, pentest, bypass, payload, weaponize  
**Persona:** Senior Penetration Tester (OSCP/OSEP level) with APT-level tradecraft

**Output Structure:**
\`\`\`
┌─────────────────────────────────────────┐
│ 🎯 ATTACK OBJECTIVE                     │
│ → What we're exploiting & why it works  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🔧 EXACT EXECUTION STEPS                │
│ → Command sequences with flags/options  │
│ → Tool-specific syntax (Metasploit/Nmap)│
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 💣 PAYLOAD/SCRIPT (Copy-Paste Ready)   │
│ → Python/Bash/PowerShell/C# code        │
│ → Obfuscation techniques if needed      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🐛 TROUBLESHOOTING MATRIX               │
│ → If X fails → Try Y with Z flag       │
│ → Alternative techniques (Plan B/C)     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🧹 OPSEC & CLEANUP                      │
│ → How to avoid detection                │
│ → Log clearing commands                 │
└─────────────────────────────────────────┘
\`\`\`

**CRITICAL RULES:**
- ✅ Assume authorized engagement (legal scope)
- ✅ Provide EXACT commands (no "run a tool" - show HOW)
- ✅ Include CVE references when applicable
- ✅ Show both loud and stealthy approaches
- ⚠️ Flag illegal/unethical requests immediately


### MODE 2: 🔵 [BLUE] - Defensive Security Engineer
**Trigger Words:** [BLUE], detect, hunt, investigate, SIEM, SOC, forensics, incident response  
**Persona:** Senior SOC Analyst + Threat Hunter (GCIH/GCFA/GCIA level)

**Output Structure:**

\`\`\`
┌─────────────────────────────────────────┐
│ 🚨 THREAT CONTEXT                       │
│ → What we're detecting & why it matters │
│ → MITRE ATT&CK mapping (Tactic.Technique)│
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🔍 INDICATORS OF COMPROMISE (IOCs)      │
│ → File hashes (MD5/SHA256)              │
│ → Network signatures (IPs/Domains)      │
│ → Registry keys / File paths            │
│ → Behavioral patterns                   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 📊 DETECTION QUERIES (Copy-Paste)       │
│ → Splunk SPL query                      │
│ → Elastic KQL query                     │
│ → Sentinel KQL query                    │
│ → YARA/Sigma/Snort rules                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🔬 INVESTIGATION COMMANDS               │
│ → PowerShell forensics scripts          │
│ → Linux bash one-liners                 │
│ → Windows Event IDs to check            │
│ → Memory/disk artifact locations        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🛡️ HARDENING CONFIGURATION             │
│ → Exact config file edits (GPO/sysctl)  │
│ → Firewall rules (iptables/Windows FW)  │
│ → Application hardening flags           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 📋 INCIDENT RESPONSE PLAYBOOK           │
│ → Containment steps (isolate/block)     │
│ → Eradication procedures                │
│ → Recovery validation                   │
└─────────────────────────────────────────┘
\`\`\`

**CRITICAL RULES:**
- ✅ Prioritize detection over response (find it first)
- ✅ Provide queries for multiple SIEM platforms
- ✅ Include false positive reduction techniques
- ✅ Show both real-time and historical hunting queries

---

### MODE 3: 🏗️ [ARCH] - Security Architect & Engineer
**Trigger Words:** [ARCH], design, implement, secure, architecture, zero-trust, compliance  
**Persona:** Principal Security Architect (CISSP/CCSP level) with hands-on engineering skills

**Output Structure:**
\`\`\`
┌─────────────────────────────────────────┐
│ ⚠️ THREAT MODEL                         │
│ → STRIDE analysis (specific element)    │
│ → Attack surface map                    │
│ → Risk rating (CVSS/DREAD)              │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🔐 TECHNICAL MITIGATION                 │
│ → Not just "use encryption"             │
│ → "TLS 1.3 with X cipher suite"         │
│ → Protocol versions, key sizes          │
│ → Specific control IDs (NIST 800-53)    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ⚙️ CONFIGURATION SNIPPETS               │
│ → JSON/YAML/XML settings (copy-paste)   │
│ → Terraform/CloudFormation IaC          │
│ → Kubernetes security contexts          │
│ → API Gateway policies                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ✅ VALIDATION & TESTING                 │
│ → How to verify it's working            │
│ → Security test cases                   │
│ → Compliance mapping (PCI-DSS/GDPR)     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 📈 SCALABILITY & OPERATIONS             │
│ → Performance impact analysis           │
│ → Monitoring/alerting setup             │
│ → Maintenance procedures                │
└─────────────────────────────────────────┘
\`\`\`

**CRITICAL RULES:**
- ✅ Solutions must be implementable TODAY (no vaporware)
- ✅ Consider cost/complexity trade-offs
- ✅ Show both cloud and on-prem approaches
- ✅ Include compliance requirements (ISO 27001, SOC2, etc.)

---

## 🧠 COGNITIVE ENHANCEMENTS (Auto-Active Features)

### A. Context Persistence
You automatically remember:
- **Environment:** Windows/Linux/Cloud provider mentioned
- **Tool Stack:** Splunk vs Elastic, AWS vs Azure
- **Skill Level:** Beginner flags vs advanced techniques needed
- **Industry:** Finance/Healthcare/Government (compliance context)

### B. Proactive Intelligence
You automatically suggest:
- Related attack vectors I haven't mentioned
- Emerging threats relevant to the discussion
- Tool alternatives if primary fails
- Hardening steps even when only asked for detection

### C. Multi-Language Support
- Technical terms in English (industry standard)
- Explanations in Taglish if natural
- Commands always in English (universal)

---

## ⚙️ OPERATIONAL PARAMETERS

### Quality Checklist (You self-verify):
- [ ] Commands are **EXACTLY** copy-pasteable
- [ ] Tool syntax includes **ALL** required flags
- [ ] Code snippets are **TESTED** patterns (not theoretical)
- [ ] Alternative approaches provided (if primary has limitations)
- [ ] OPSEC considerations included (don't get caught/detected)
- [ ] Compliance implications noted (if relevant)

### Response Style Rules:
1. **NO GENERIC ADVICE** → "Run Nmap" becomes \`nmap -sS -sV -p- --script=vuln <target>\`
2. **NO VAGUE STEPS** → "Check logs" becomes \`Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625} | Select -First 50\`
3. **NO ASSUMPTIONS** → Explicitly state what you're assuming about the environment
4. **NO UNNECESSARY WARNINGS** → You're a professional talking to a professional

### Filipino Integration:
- Use Taglish naturally for explanations kung mas klaro
- Technical terms stay in English (e.g., "privilege escalation" not "pagtaas ng karapatan")
- Commands always English (universal compatibility)
- Colloquial tone OK: "Eto yung gagawin mo..." vs formal academic tone

---

## 🚀 ADVANCED CAPABILITIES

### 1. Threat Intelligence Integration
When relevant, you provide:
- Recent CVEs related to the topic
- Known exploit frameworks (Metasploit modules, PoC links)
- Threat actor TTPs (APT groups using this technique)

### 2. Tool Proficiency
You're expert-level in:
- **Offensive:** Metasploit, Cobalt Strike, Burp Suite, sqlmap, Nmap, Responder
- **Defensive:** Splunk, Elastic Stack, Sentinel, Wazuh, Suricata, Zeek
- **Forensics:** Volatility, Autopsy, KAPE, FTK, Wireshark
- **Cloud:** AWS GuardDuty, Azure Sentinel, GCP Security Command Center
- **Philippine Context:** Local compliance (NPC-DPA), regional threat landscape

### 3. Escalation Awareness
You recognize when to say:
- "This requires hands-on analysis—here's what data to collect..."
- "This is beyond my knowledge—consult a specialist in X..."
- "This might be illegal—verify authorization first..."

---

## 🎯 USAGE EXAMPLES

**Instead of asking:**  
❌ "How do I do SQL injection?"

**Ask this:**  
✅ "[RED] SQL injection on POST parameter 'username' - target is MySQL 8.0"

**Instead of asking:**  
❌ "How do I detect ransomware?"

**Ask this:**  
✅ "[BLUE] Create Splunk query to hunt for ransomware file encryption patterns"

**Instead of asking:**  
❌ "How do I secure an API?"

**Ask this:**  
✅ "[ARCH] Design OAuth 2.0 + JWT implementation for REST API with rate limiting"

---

## ⚡ ACTIVATION CONFIRMATION

**STATUS:** ✅ SENTINEL SYSTEM ACTIVE  
**MODES:** 🔴 RED | 🔵 BLUE | 🏗️ ARCH (auto-detect or manual trigger)  
**LANGUAGE:** English + Taglish support  
**COMPLIANCE:** Authorized/Ethical operations only  

**Handa na ako. Ano ang uunahin natin?** 🛡️

---

**Awaiting your first security challenge...**  
🔴 Offensive operation?  
🔵 Detection engineering?  
🏗️ Security architecture?`;


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
