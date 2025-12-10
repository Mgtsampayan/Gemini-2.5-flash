"use client";

/**
 * Enhanced Markdown Renderer Component
 */

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface MarkdownProps {
    content: string;
    className?: string;
    isStreaming?: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TypeScript",
    jsx: "JavaScript",
    py: "Python",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    go: "Go",
    rust: "Rust",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    yaml: "YAML",
    bash: "Bash",
    shell: "Shell",
};

function getLanguageDisplay(lang: string): string {
    return LANGUAGE_NAMES[lang.toLowerCase()] || lang.toUpperCase();
}

type TokenType = "keyword" | "string" | "number" | "comment" | "function" | "operator" | "punctuation" | "plain";

interface Token {
    type: TokenType;
    value: string;
}

function tokenize(code: string, language: string): Token[] {
    const tokens: Token[] = [];
    const keywords: Record<string, string[]> = {
        javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "new", "this", "null", "undefined", "true", "false"],
        typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "new", "this", "null", "undefined", "true", "false", "interface", "type", "enum"],
        python: ["def", "class", "return", "if", "elif", "else", "for", "while", "import", "from", "try", "except", "raise", "with", "lambda", "None", "True", "False", "and", "or", "not", "in", "is", "self"],
    };

    const lang = language.toLowerCase();
    const langKeywords = keywords[lang] || keywords.javascript || [];

    const patterns: [RegExp, TokenType][] = [
        [/^\/\/.*$/m, "comment"],
        [/^#.*$/m, "comment"],
        [/^\/\*[\s\S]*?\*\//m, "comment"],
        [/^"(?:[^"\\]|\\.)*"/, "string"],
        [/^'(?:[^'\\]|\\.)*'/, "string"],
        [/^`(?:[^`\\]|\\.)*`/, "string"],
        [/^\d+\.?\d*/, "number"],
        [/^[+\-*/%=!<>&|?:]+/, "operator"],
        [/^[{}[\]();,.]/, "punctuation"],
        [/^\w+/, "plain"],
        [/^\s+/, "plain"],
    ];

    let remaining = code;

    while (remaining.length > 0) {
        let matched = false;

        for (const [pattern, type] of patterns) {
            const match = remaining.match(pattern);
            if (match) {
                let tokenType = type;
                const value = match[0];

                if (type === "plain" && langKeywords.includes(value)) {
                    tokenType = "keyword";
                } else if (type === "plain" && remaining.slice(value.length).match(/^\s*\(/)) {
                    tokenType = "function";
                }

                tokens.push({ type: tokenType, value });
                remaining = remaining.slice(value.length);
                matched = true;
                break;
            }
        }

        if (!matched && remaining.length > 0) {
            tokens.push({ type: "plain", value: remaining.charAt(0) });
            remaining = remaining.slice(1);
        }
    }

    return tokens;
}

function tokenToHtml(token: Token): string {
    const styles: Record<TokenType, string> = {
        keyword: "text-purple-400 font-medium",
        string: "text-emerald-400",
        number: "text-amber-400",
        comment: "text-gray-500 italic",
        function: "text-blue-400",
        operator: "text-pink-400",
        punctuation: "text-gray-400",
        plain: "",
    };

    const escaped = token.value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    if (styles[token.type]) {
        return `<span class="${styles[token.type]}">${escaped}</span>`;
    }
    return escaped;
}

function CopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [code]);

    return (
        <button
            onClick={handleCopy}
            className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-all",
                "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white",
                copied && "bg-emerald-500/20 text-emerald-400"
            )}
            aria-label={copied ? "Copied!" : "Copy code"}
        >
            {copied ? "Copied!" : "Copy"}
        </button>
    );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
    const highlightedHtml = useMemo(() => {
        const tokens = tokenize(code, language);
        return tokens.map(tokenToHtml).join("");
    }, [code, language]);

    return (
        <div className="relative group my-3 rounded-lg overflow-hidden bg-[#1e1e2e] border border-white/10">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <span className="text-xs font-medium text-white/50">
                    {getLanguageDisplay(language)}
                </span>
                <CopyButton code={code} />
            </div>
            <pre className="p-4 overflow-x-auto">
                <code
                    className="text-sm font-mono leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
            </pre>
        </div>
    );
}

function parseMarkdown(text: string): string {
    let html = text;

    html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>');
    html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc list-inside">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside">$1</li>');
    html = html.replace(/\n\n/g, '</p><p class="my-2">');
    html = html.replace(/\n/g, "<br>");
    html = `<p class="my-2">${html}</p>`;
    html = html.replace(/<p class="my-2"><\/p>/g, "");

    return html;
}

export default function Markdown({ content, className = "", isStreaming = false }: MarkdownProps) {
    const parts = useMemo(() => {
        const regex = /```(\w*)\n?([\s\S]*?)```/g;
        const result: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                result.push({ type: "text", content: content.slice(lastIndex, match.index) });
            }
            const codeContent = match[2] ?? "";
            result.push({ type: "code", content: codeContent.trim(), language: match[1] || "plaintext" });
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < content.length) {
            result.push({ type: "text", content: content.slice(lastIndex) });
        }

        return result;
    }, [content]);

    return (
        <div className={cn("leading-relaxed", isStreaming && "animate-pulse-subtle", className)}>
            {parts.map((part, index) => {
                if (part.type === "code" && part.language) {
                    return <CodeBlock key={index} code={part.content} language={part.language} />;
                }
                return (
                    <div
                        key={index}
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(part.content) }}
                    />
                );
            })}
        </div>
    );
}
