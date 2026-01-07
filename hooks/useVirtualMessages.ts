/**
 * useVirtualMessages Hook
 * 
 * Virtualizes message list for efficient rendering of long conversations.
 * Only renders messages that are visible in the viewport + buffer.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface VirtualItem<T> {
    index: number;
    item: T;
    style: React.CSSProperties;
}

interface UseVirtualMessagesOptions<T> {
    /** Array of items to virtualize */
    items: T[];
    /** Estimated height of each item in pixels */
    estimatedItemHeight: number;
    /** Height of the container in pixels */
    containerHeight: number;
    /** Number of items to render above/below visible area */
    overscan?: number;
}

interface UseVirtualMessagesResult<T> {
    /** Virtual items to render */
    virtualItems: VirtualItem<T>[];
    /** Total height of all items for scrollbar */
    totalHeight: number;
    /** Current scroll position */
    scrollTop: number;
    /** Scroll handler to attach to container */
    onScroll: (e: React.UIEvent<HTMLElement>) => void;
    /** Ref to measure item heights */
    measureRef: (index: number) => (el: HTMLElement | null) => void;
    /** Scroll to a specific index */
    scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
}

export function useVirtualMessages<T>({
    items,
    estimatedItemHeight,
    containerHeight,
    overscan = 3,
}: UseVirtualMessagesOptions<T>): UseVirtualMessagesResult<T> {
    const [scrollTop, setScrollTop] = useState(0);
    const measuredHeights = useRef<Map<number, number>>(new Map());
    const containerRef = useRef<HTMLElement | null>(null);

    // Calculate item positions based on measured or estimated heights
    const { itemPositions, totalHeight } = useMemo(() => {
        const positions: number[] = [];
        let offset = 0;

        for (let i = 0; i < items.length; i++) {
            positions.push(offset);
            const height = measuredHeights.current.get(i) ?? estimatedItemHeight;
            offset += height;
        }

        return { itemPositions: positions, totalHeight: offset };
    }, [items.length, estimatedItemHeight]);

    // Find visible range
    const visibleRange = useMemo(() => {
        const startIndex = itemPositions.findIndex((pos, i) => {
            const height = measuredHeights.current.get(i) ?? estimatedItemHeight;
            return pos + height > scrollTop;
        });

        let endIndex = startIndex;
        let currentPos = itemPositions[startIndex] ?? 0;

        while (endIndex < items.length && currentPos < scrollTop + containerHeight) {
            const height = measuredHeights.current.get(endIndex) ?? estimatedItemHeight;
            currentPos += height;
            endIndex++;
        }

        return {
            start: Math.max(0, startIndex - overscan),
            end: Math.min(items.length - 1, endIndex + overscan),
        };
    }, [scrollTop, containerHeight, itemPositions, items.length, estimatedItemHeight, overscan]);

    // Build virtual items
    const virtualItems = useMemo((): VirtualItem<T>[] => {
        const result: VirtualItem<T>[] = [];

        for (let i = visibleRange.start; i <= visibleRange.end; i++) {
            const item = items[i];
            if (!item) continue;

            result.push({
                index: i,
                item,
                style: {
                    position: "absolute",
                    top: itemPositions[i] ?? 0,
                    left: 0,
                    right: 0,
                    minHeight: measuredHeights.current.get(i) ?? estimatedItemHeight,
                },
            });
        }

        return result;
    }, [visibleRange, items, itemPositions, estimatedItemHeight]);

    // Scroll handler
    const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        containerRef.current = e.currentTarget;
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Measure ref for dynamic heights
    const measureRef = useCallback((index: number) => (el: HTMLElement | null) => {
        if (el) {
            const height = el.getBoundingClientRect().height;
            if (measuredHeights.current.get(index) !== height) {
                measuredHeights.current.set(index, height);
            }
        }
    }, []);

    // Scroll to index
    const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
        const position = itemPositions[index];
        if (position !== undefined && containerRef.current) {
            containerRef.current.scrollTo({ top: position, behavior });
        }
    }, [itemPositions]);

    // Auto-scroll to bottom when new items added
    useEffect(() => {
        if (items.length > 0 && containerRef.current) {
            const lastIndex = items.length - 1;
            const lastPosition = itemPositions[lastIndex] ?? 0;
            const lastHeight = measuredHeights.current.get(lastIndex) ?? estimatedItemHeight;

            // Only auto-scroll if already near bottom
            const isNearBottom = scrollTop + containerHeight >= totalHeight - 100;
            if (isNearBottom) {
                containerRef.current.scrollTo({
                    top: lastPosition + lastHeight,
                    behavior: "smooth",
                });
            }
        }
    }, [items.length, itemPositions, estimatedItemHeight, scrollTop, containerHeight, totalHeight]);

    return {
        virtualItems,
        totalHeight,
        scrollTop,
        onScroll,
        measureRef,
        scrollToIndex,
    };
}

export default useVirtualMessages;
