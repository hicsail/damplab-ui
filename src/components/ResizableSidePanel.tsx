import React, { useRef, useState } from 'react';

const STORAGE_KEY = 'canvas.paramsPanelWidth';
const MIN_WIDTH = 280;
/** The canvas always keeps at least this much of the window. */
const CANVAS_RESERVE = 320;

function storedWidth(): number | null {
    try {
        const width = Number(window.localStorage.getItem(STORAGE_KEY));
        return Number.isFinite(width) && width >= MIN_WIDTH ? width : null;
    } catch {
        return null;
    }
}

export function clampPanelWidth(width: number, windowWidth: number): number {
    return Math.max(MIN_WIDTH, Math.min(width, windowWidth - CANVAS_RESERVE));
}

/**
 * The canvas's right-hand parameters panel, widened or narrowed by dragging its
 * left edge (a wide matrix needs the room). Until it is first dragged it keeps
 * the old flexible width; the dragged width is remembered for this browser.
 */
export default function ResizableSidePanel({ children }: { children: React.ReactNode }) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState<number | null>(storedWidth);

    const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
        const panel = panelRef.current;
        if (!panel) return;
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = panel.getBoundingClientRect().width;
        let latest = startWidth;
        const onMove = (e: PointerEvent) => {
            latest = clampPanelWidth(startWidth + (startX - e.clientX), window.innerWidth);
            setWidth(latest);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            try { window.localStorage.setItem(STORAGE_KEY, String(Math.round(latest))); } catch { /* not remembered */ }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const sized: React.CSSProperties = width === null
        ? { minWidth: '10%', width: 850 }
        : { width: clampPanelWidth(width, window.innerWidth), flexShrink: 0 };

    return (
        <div ref={panelRef} style={{ ...sized, position: 'relative', borderLeft: 'solid 1px' }}>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize the parameters panel"
                title="Drag to resize"
                onPointerDown={startDrag}
                onDoubleClick={() => {
                    setWidth(null);
                    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
                }}
                style={{ position: 'absolute', left: -4, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 10 }}
            />
            {children}
        </div>
    );
}
