import {cn} from "@/lib/utils/classnames";
import {useVirtualizer} from "@tanstack/react-virtual";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {useEffect, useMemo, useRef, useState} from "react";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {FileIcon, FileX, RefreshCw, ServerCrash, Terminal} from "lucide-react";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {adminLogFileOptions, adminLogFilesOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "text";

type RawLogLine = {
    kind: string;
    text?: string;
    lineNumber: number;
    record?: Record<string, unknown>;
};

type PrettyLogEntry = {
    time?: string;
    level: LogLevel;
    message: string;
    details?: string;
    lineNumber: number;
};


export const Route = createFileRoute("/_admin/admin/error-logs")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(adminLogFilesOptions);
    },
    component: AdminRuntimeLogsPage,
});


const commonPinoKeys = new Set(["level", "time", "pid", "hostname", "name", "msg", "message", "v"]);

const pinoLevels: Record<number, LogLevel> = {
    10: "trace",
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal",
};

const logLevelFilters: Array<{ value: LogLevel; label: string; className: string; activeClassName: string }> = [
    {
        value: "fatal",
        label: "Fatal",
        activeClassName: "bg-fuchsia-500/15 text-fuchsia-100 ring-fuchsia-500/30",
        className: "border-fuchsia-500/25 text-fuchsia-300 hover:bg-fuchsia-500/10",
    },
    {
        value: "error",
        label: "Error",
        activeClassName: "bg-red-500/15 text-red-100 ring-red-500/30",
        className: "border-red-500/25 text-red-300 hover:bg-red-500/10",
    },
    {
        value: "warn",
        label: "Warn",
        activeClassName: "bg-amber-500/15 text-amber-100 ring-amber-500/30",
        className: "border-amber-500/25 text-amber-300 hover:bg-amber-500/10",
    },
    {
        value: "info",
        label: "Info",
        activeClassName: "bg-emerald-500/15 text-emerald-100 ring-emerald-500/30",
        className: "border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10",
    },
    {
        value: "debug",
        label: "Debug",
        activeClassName: "bg-sky-500/15 text-sky-100 ring-sky-500/30",
        className: "border-sky-500/25 text-sky-300 hover:bg-sky-500/10",
    },
    {
        value: "trace",
        label: "Trace",
        activeClassName: "bg-slate-500/15 text-slate-100 ring-slate-500/30",
        className: "border-slate-500/25 text-slate-300 hover:bg-slate-500/10",
    },
    {
        value: "text",
        label: "Text",
        activeClassName: "bg-zinc-500/15 text-zinc-100 ring-zinc-500/30",
        className: "border-zinc-500/25 text-zinc-300 hover:bg-zinc-500/10",
    },
];

const levelTextClasses: Record<LogLevel, string> = {
    error: "text-red-400",
    debug: "text-sky-400",
    text: "text-zinc-500",
    warn: "text-amber-400",
    trace: "text-slate-400",
    info: "text-emerald-400",
    fatal: "text-fuchsia-400",
};


function AdminRuntimeLogsPage() {
    const logFiles = useSuspenseQuery(adminLogFilesOptions).data;
    const [selectedFileName, setSelectedFileName] = useState<string | undefined>(() => logFiles[0]?.fileName);
    const logFileQuery = useQuery({ ...adminLogFileOptions(selectedFileName ?? ""), enabled: Boolean(selectedFileName) });
    const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(() => {
        return new Set(logLevelFilters.map((level) => level.value));
    });

    useEffect(() => {
        if (logFiles.length === 0) {
            setSelectedFileName(undefined);
            return;
        }

        if (!selectedFileName || !logFiles.some((file) => file.fileName === selectedFileName)) {
            setSelectedFileName(logFiles[0].fileName);
        }
    }, [logFiles, selectedFileName]);

    const selectedFile = useMemo(() => {
        return logFiles.find((file) => file.fileName === selectedFileName);
    }, [logFiles, selectedFileName]);

    const logEntries = useMemo(() => {
        return checkLogLines(logFileQuery.data?.lines ?? []);
    }, [logFileQuery.data?.lines]);

    const levelCounts = useMemo(() => {
        const counts = new Map<LogLevel, number>();
        for (const entry of logEntries) {
            counts.set(entry.level, (counts.get(entry.level) ?? 0) + 1);
        }
        return counts;
    }, [logEntries]);

    const visibleEntries = useMemo(() => {
        return logEntries.filter((entry) => enabledLevels.has(entry.level));
    }, [enabledLevels, logEntries]);

    const activeFilterKey = useMemo(() => {
        return logLevelFilters
            .filter((level) => enabledLevels.has(level.value))
            .map((level) => level.value)
            .join(",");
    }, [enabledLevels]);

    const selectedFileInfo = logFileQuery.data?.file ?? selectedFile;
    const logContent = (() => {
        if (!selectedFileName) {
            return (
                <EmptyState
                    className="py-14"
                    icon={ServerCrash}
                    message="No runtime log files found"
                />
            );
        }

        if (logFileQuery.isLoading) {
            return (
                <div className="space-y-1 p-3">
                    {Array.from({ length: 14 }).map((_, index) =>
                        <div
                            style={{ width: `${96 - (index % 4) * 10}%` }}
                            key={index}
                            className="h-6 animate-pulse rounded bg-zinc-900"
                        />
                    )}
                </div>
            );
        }

        if (logFileQuery.isError) {
            return (
                <div className="p-4">
                    <InlineErrorContainer>
                        {logFileQuery.error.message}
                    </InlineErrorContainer>
                </div>
            );
        }

        if (logEntries.length === 0) {
            return (
                <EmptyState
                    icon={FileIcon}
                    className="py-14"
                    message="This log file is empty."
                />
            );
        }

        if (visibleEntries.length === 0) {
            return (
                <EmptyState
                    icon={FileX}
                    className="py-14"
                    message="No log lines match the selected levels."
                />
            );
        }

        return (
            <VirtualLogViewer
                entries={visibleEntries}
                scrollKey={`${selectedFileName}:${activeFilterKey}:${visibleEntries.length}`}
            />
        );
    })();

    const toggleLevel = (level: LogLevel) => {
        setEnabledLevels((currentLevels) => {
            const nextLevels = new Set(currentLevels);
            if (nextLevels.has(level)) nextLevels.delete(level);
            else nextLevels.add(level);
            return nextLevels;
        });
    };

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Runtime Logs"
                description="Read structured pino logs from the configured runtime log directory."
            />

            <Card>
                <CardHeader className="gap-4 border-b">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="size-4 text-app-accent"/>
                                Log viewer
                            </CardTitle>
                            <CardDescription className="mt-1 text-muted-foreground">
                                Pino-style formatted log viewer. Newest entries are shown first by opening at the bottom.
                            </CardDescription>
                        </div>

                        <div className="flex gap-2 max-sm:w-full">
                            <Select value={selectedFileName} disabled={logFiles.length === 0} onValueChange={setSelectedFileName}>
                                <SelectTrigger className="w-72 max-w-[70vw] max-sm:w-full">
                                    <SelectValue placeholder="No log files"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {logFiles.map((file) =>
                                        <SelectItem key={file.fileName} value={file.fileName}>
                                            {file.fileName}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <Button
                                size="icon"
                                variant="outline"
                                title="Refresh selected log"
                                disabled={!selectedFileName || logFileQuery.isFetching}
                                onClick={() => logFileQuery.refetch()}
                            >
                                <RefreshCw className={logFileQuery.isFetching ? "animate-spin" : ""}/>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            {logLevelFilters.map((level) => {
                                const count = levelCounts.get(level.value) ?? 0;
                                const isEnabled = enabledLevels.has(level.value);

                                return (
                                    <button
                                        type="button"
                                        key={level.value}
                                        aria-pressed={isEnabled}
                                        onClick={() => toggleLevel(level.value)}
                                        className={cn("rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]",
                                            level.className, isEnabled && level.activeClassName,
                                        )}
                                    >
                                        {level.label}
                                        {count > 0 &&
                                            <span className="ml-2">
                                                ({count})
                                            </span>
                                        }
                                    </button>
                                );
                            })}
                        </div>

                        {selectedFileInfo &&
                            <p className="font-mono text-xs text-muted-foreground">
                                {formatBytes(selectedFileInfo.sizeBytes)}
                                {" · "}
                                {formatDateTime(selectedFileInfo.modifiedAt, { seconds: true })}
                                {logFileQuery.data && ` · ${visibleEntries.length}/${logEntries.length} visible`}
                            </p>
                        }
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {logContent}
                </CardContent>
            </Card>
        </DashboardShell>
    );
}


interface VirtualLogViewerProps {
    scrollKey: string;
    entries: PrettyLogEntry[];
}


function VirtualLogViewer({ entries, scrollKey }: VirtualLogViewerProps) {
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

    return (
        <div ref={parentRef} className="h-[90vh] overflow-auto bg-[#070707]">
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
}


function PrettyLogRow({ entry }: { entry: PrettyLogEntry }) {
    return (
        <div
            title={`Line ${entry.lineNumber}`}
            className="border-b px-3 py-1.5 font-mono text-[12px] leading-[1.45] hover:bg-white/2"
        >
            <div className="grid grid-cols-[7.5rem_4.75rem_minmax(0,1fr)] gap-3 max-sm:grid-cols-[4.75rem_minmax(0,1fr)]">
                <span className="select-none text-muted-foreground max-sm:hidden">
                    {entry.time ?? "--:--:--.---"}
                </span>
                <span className={cn("select-none font-semibold uppercase", levelTextClasses[entry.level])}>
                    {entry.level}
                </span>
                <span className="min-w-0 whitespace-pre-wrap wrap-break-word ">
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


function checkLogLines(lines: RawLogLine[]) {
    return lines.map((line): PrettyLogEntry => {
        if (line.kind === "text") {
            return {
                level: "text",
                message: line.text ?? "",
                lineNumber: line.lineNumber,
            };
        }

        const record = line.record as Record<string, unknown>;
        const message = getLogMessage(record);
        const time = formatLogTime(record.time);
        const details = formatLogDetails(record);
        const level = checkLogLevel(record.level);

        return {
            lineNumber: line.lineNumber,
            level,
            time,
            message,
            details,
        };
    });
}


function checkLogLevel(level: unknown): LogLevel {
    if (typeof level === "number") return pinoLevels[level] ?? "text";
    if (typeof level !== "string") return "text";

    const newLevel = level.toLowerCase();
    if (logLevelFilters.some((filter) => filter.value === newLevel)) {
        return newLevel as LogLevel;
    }

    return "text";
}


function getLogMessage(record: Record<string, unknown>) {
    return String(record.msg ?? record.message ?? "(no message)");
}


function formatLogTime(time: unknown) {
    if (typeof time !== "string" && typeof time !== "number") return undefined;

    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return String(time);

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}


function formatLogDetails(record: Record<string, unknown>) {
    const details = getRecordDetails(record);
    if (details.length === 0) return undefined;

    return details.map(([key, value]) => formatDetail(key, value)).join("\n");
}


function formatDetail(key: string, value: unknown) {
    const formattedValue = formatDetailValue(key, value);
    const [firstLine, ...restLines] = formattedValue.split("\n");

    if (restLines.length === 0) {
        return `    ${key}: ${firstLine}`;
    }

    return [
        `    ${key}: ${firstLine}`,
        ...restLines.map((line) => `        ${line}`),
    ].join("\n");
}


function formatDetailValue(key: string, value: unknown) {
    if (key === "err" && value && typeof value === "object" && "stack" in value && typeof value.stack === "string") {
        return value.stack;
    }

    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}


function getRecordDetails(record: Record<string, unknown>) {
    return Object.entries(record).filter(([key]) => !commonPinoKeys.has(key));
}


function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
