"use client";

const TypingIndicator = () => {
    return (
        <div className="flex items-end gap-3 mb-4">
            {/* Bot Avatar */}
            <div className="w-8 h-8 shrink-0 rounded-full bg-accent/20 flex items-center justify-center ring-2 ring-offset-2 ring-offset-background ring-accent/30">
                <span className="text-xs font-medium text-accent">AI</span>
            </div>

            {/* Typing bubble */}
            <div className="message-bot rounded-2xl rounded-bl-sm border border-border/50 px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                </div>
            </div>
        </div>
    );
};

export default TypingIndicator;