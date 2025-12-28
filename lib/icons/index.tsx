/**
 * Icon Components
 * 
 * Reusable SVG icon components for the application.
 */

// Sparkle Icon
interface IconProps {
    className?: string;
}

export function SparkleIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
            <path d="M19 15L19.54 17.46L22 18L19.54 18.54L19 21L18.46 18.54L16 18L18.46 17.46L19 15Z" />
            <path d="M5 17L5.54 19.46L8 20L5.54 20.54L5 23L4.46 20.54L2 20L4.46 19.46L5 17Z" />
        </svg>
    );
}

// Menu Icon
export function MenuIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

// Trash Icon
export function TrashIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    );
}

// Send Icon
export function SendIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    );
}

// Stop Icon
export function StopIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
    );
}

// Loading Icon
export function LoadingIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
