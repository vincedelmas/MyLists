import {useEffect, useMemo, useState} from "react";
import {createFileRoute} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {FileIcon, RefreshCw, ServerCrash, Terminal} from "lucide-react";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminLogFileOptions, adminLogFilesOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";


export const Route = createFileRoute("/_admin/admin/error-logs")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(adminLogFilesOptions);
    },
    component: AdminRuntimeLogsPage,
});


const commonPinoKeys = new Set(["level", "time", "pid", "hostname", "name", "msg"]);

const pinoLevels: Record<number, string> = {
    10: "trace",
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal",
};

const levelClasses: Record<string, string> = {
    trace: "border-slate-500/30 bg-slate-500/10 text-slate-400",
    debug: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    info: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    error: "border-red-500/30 bg-red-500/10 text-red-400",
    fatal: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400",
    text: "border-border bg-muted/40 text-muted-foreground",
};


function AdminRuntimeLogsPage() {
    const logFiles = useSuspenseQuery(adminLogFilesOptions).data;
    const [selectedFileName, setSelectedFileName] = useState<string | undefined>(() => logFiles[0]?.fileName);
    const logFileQuery = useQuery({ ...adminLogFileOptions(selectedFileName ?? ""), enabled: Boolean(selectedFileName) });

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

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Runtime Logs"
                description="Read structured pino logs from the configured runtime log directory."
            />

            <div className="space-y-5">
                <Card className="border-app-accent/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="size-4 text-app-accent"/>
                            Log file
                        </CardTitle>
                        <CardDescription>
                            Select a log file. Rotated gzip archives and oversized files are intentionally skipped.
                        </CardDescription>
                        <CardAction className="flex gap-2 max-sm:col-start-1 max-sm:row-start-3 max-sm:justify-self-start">
                            <Select value={selectedFileName} disabled={logFiles.length === 0} onValueChange={setSelectedFileName}>
                                <SelectTrigger className="w-64 max-w-[70vw]">
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
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        {selectedFile ?
                            <div className="grid gap-3 text-sm sm:grid-cols-3">
                                <LogMeta
                                    label="Modified"
                                    value={formatDateTime(selectedFile.modifiedAt, { seconds: true })}
                                />
                                <LogMeta
                                    label="Size"
                                    value={formatBytes(selectedFile.sizeBytes)}
                                />
                                <LogMeta
                                    label="Readable"
                                    value={selectedFile.canRead ? "Yes" : "No"}
                                />
                            </div>
                            :
                            <EmptyState
                                className="py-6"
                                icon={ServerCrash}
                                message="No runtime log files found"
                            />
                        }
                    </CardContent>
                </Card>

                {selectedFileName &&
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle>
                                {selectedFileName}
                            </CardTitle>
                            <CardDescription>
                                {logFileQuery.data
                                    ? `${logFileQuery.data.lines.length} log line${logFileQuery.data.lines.length === 1 ? "" : "s"} loaded`
                                    : "Select a file to load its contents"
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {logFileQuery.isLoading &&
                                <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                                    {Array.from({ length: 8 }).map((_, index) =>
                                        <div
                                            style={{ width: `${96 - (index % 3) * 12}%` }}
                                            key={index} className="h-9 animate-pulse rounded-md bg-muted"
                                        />
                                    )}
                                </div>
                            }

                            {logFileQuery.isError &&
                                <InlineErrorContainer>
                                    {logFileQuery.error ? logFileQuery.error.message : "Failed to read log file"}
                                </InlineErrorContainer>
                            }

                            {logFileQuery.data && logFileQuery.data.lines.length === 0 &&
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    <EmptyState
                                        icon={FileIcon}
                                        message="This log file is empty."
                                    />
                                </div>
                            }

                            {logFileQuery.data && logFileQuery.data.lines.length > 0 &&
                                <div className="max-h-[80vh] space-y-1 overflow-auto rounded-lg bg-black/50 p-3 border border-neutral-600">
                                    {logFileQuery.data.lines.map((line) =>
                                        <LogLineRow
                                            line={line}
                                            key={line.lineNumber}
                                        />
                                    )}
                                </div>
                            }
                        </CardContent>
                    </Card>
                }
            </div>
        </DashboardShell>
    );
}


function LogMeta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 font-medium">
                {value}
            </p>
        </div>
    );
}


function LogLineRow({ line }: { line: { lineNumber: number; kind: string; record?: Record<string, unknown>; text?: string } }) {
    if (line.kind !== "json" || !line.record) {
        return (
            <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/5 p-3
            font-mono text-xs text-slate-200">
                <span className="select-none text-slate-500">
                    #{line.lineNumber}
                </span>
                <span className="wrap-break-word">
                    {line.text}
                </span>
            </div>
        );
    }

    const details = getRecordDetails(line.record);
    const level = getLevelLabel(line.record.level);
    const time = typeof line.record.time === "string" ? line.record.time : undefined;
    const message = typeof line.record.msg === "string" ? line.record.msg : "No message";

    return (
        <details className="group rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200 open:bg-white/[0.07]">
            <summary
                className="grid cursor-pointer list-none grid-cols-[4rem_auto_minmax(0,1fr)_auto] items-center gap-3 font-mono text-xs
                marker:hidden max-sm:grid-cols-[3rem_auto_minmax(0,1fr)]">
                <span className="select-none text-slate-500">
                    #{line.lineNumber}
                </span>
                <Badge variant="outline" className={levelClasses[level] ?? levelClasses.text}>
                    {level}
                </Badge>
                <span className="truncate text-slate-100">
                    {message}
                </span>
                <span className="text-muted-foreground max-sm:hidden">
                    {time ? formatDateTime(time, { seconds: true }) : "no time"}
                </span>
            </summary>
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                {time &&
                    <p className="font-mono text-xs text-slate-500">
                        {time}
                    </p>
                }
                {details.length > 0 &&
                    <pre className="overflow-auto rounded-lg bg-black/50 p-3 text-xs leading-relaxed text-slate-200">
                        {JSON.stringify(Object.fromEntries(details), null, 2)}
                    </pre>
                }
            </div>
        </details>
    );
}


function getLevelLabel(level: unknown) {
    if (typeof level === "number") return pinoLevels[level] ?? String(level);
    if (typeof level === "string") return level.toLowerCase();
    return "text";
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
