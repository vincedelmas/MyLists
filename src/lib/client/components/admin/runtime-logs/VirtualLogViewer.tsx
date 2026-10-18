import {useEffect, useRef} from "react";
import {cn} from "@/lib/utils/classnames";
import {useVirtualizer} from "@tanstack/react-virtual";
import {levelTextClasses, type PrettyLogEntry} from "@/lib/client/components/admin/runtime-logs/log-formatting";


interface VirtualLogViewerProps {
    scrollKey: string;
    entries: PrettyLogEntry[];
}


export function VirtualLogViewer({ entries, scrollKey }: VirtualLogViewerProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        overscan: 24,
        count: entries.length,
        estimateSize: () => 34,
        getScrollElement: () => parentRef.current,
    });

    const rowVirtualizerRef = useRef(rowVirtualizer);
    rowVirtualizerRef.current = rowVirtualizer;

    useEffect(() => {
        if (entries.length === 0) return;

        const frame = window.requestAnimationFrame(() => {
            rowVirtualizerRef.current.scrollToIndex(entries.length - 1, { align: "end" });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [entries.length, scrollKey]);

    // A scrollable log region needs keyboard focus so arrow and page keys can scroll it.
    /* oxlint-disable jsx-a11y/no-noninteractive-tabindex */
    return (
        <div
            tabIndex={0}
            role="region"
            ref={parentRef}
            aria-label="Log entries"
            className="h-[65vh] min-h-80 overflow-auto rounded-lg border bg-background focus-visible:outline-ring"
        >
            <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const entry = entries[virtualRow.index];

                    return (
                        <div
                            key={entry.lineNumber}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className="absolute left-0 top-0 w-full"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                            <PrettyLogRow
                                entry={entry}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
    /* oxlint-enable jsx-a11y/no-noninteractive-tabindex */
}


function PrettyLogRow({ entry }: { entry: PrettyLogEntry }) {
    return (
        <div
            title={`Line ${entry.lineNumber}`}
            className="border-b px-3 py-1.5 font-mono text-[12px] leading-[1.45] hover:bg-muted/50"
        >
            <div className="grid grid-cols-[7.5rem_4.75rem_minmax(0,1fr)] gap-3 max-sm:grid-cols-[4.75rem_minmax(0,1fr)]">
                <span className="select-none text-muted-foreground max-sm:hidden">
                    {entry.time ?? "--:--:--.---"}
                </span>
                <span className={cn("select-none font-semibold uppercase", levelTextClasses[entry.level])}>
                    {entry.level}
                </span>
                <span className="min-w-0 whitespace-pre-wrap wrap-break-word">
                    {entry.message}
                </span>
            </div>

            {entry.details &&
                <pre className="ml-49 mt-1 whitespace-pre-wrap wrap-break-word text-[12px] leading-relaxed max-sm:ml-0">
                    {entry.details}
                </pre>
            }
        </div>
    );
}
