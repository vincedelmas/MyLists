import {useId, useMemo, useState} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {formatBytes} from "@/lib/utils/formatting/number";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {formatDateTime} from "@/lib/utils/formatting/date";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {FileIcon, FileX, RefreshCw, ServerCrash} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {VirtualLogViewer} from "@/lib/client/components/admin/runtime-logs/VirtualLogViewer";
import {adminLogFileOptions, type AdminLogFilesData} from "@/lib/client/react-query/query-options/admin.options";
import {formatLogLines, logLevels, type LogLevel} from "@/lib/client/components/admin/runtime-logs/log-formatting";


interface RuntimeLogBrowserProps {
    files: AdminLogFilesData;
    isRefreshingFiles: boolean;
    isFilesRefreshError: boolean;
    onRefreshFiles: () => Promise<unknown>;
}


export function RuntimeLogBrowser({ files, onRefreshFiles, isRefreshingFiles, isFilesRefreshError }: RuntimeLogBrowserProps) {
    const fieldId = useId();
    const queryClient = useQueryClient();
    const [enabledLevels, setEnabledLevels] = useState<LogLevel[]>(logLevels);
    const [requestedFileName, setRequestedFileName] = useState<string | undefined>(() => files[0]?.fileName);

    const selectedFile = files.find(file => file.fileName === requestedFileName) ?? files[0];
    const selectedFileName = selectedFile?.fileName;
    const fileQuery = useQuery({ ...adminLogFileOptions(selectedFileName ?? ""), enabled: Boolean(selectedFile?.canRead) });

    const entries = useMemo(() => formatLogLines(fileQuery.data?.lines ?? []), [fileQuery.data?.lines]);
    const levelCounts = useMemo(() => {
        const counts = new Map<LogLevel, number>();

        for (const entry of entries) {
            counts.set(entry.level, (counts.get(entry.level) ?? 0) + 1);
        }

        return counts;
    }, [entries]);

    const visibleEntries = entries.filter(entry => enabledLevels.includes(entry.level));
    const fileInfo = fileQuery.data?.file ?? selectedFile;

    const refreshLogs = async () => {
        await onRefreshFiles();
        await queryClient.invalidateQueries({ queryKey: ["admin", "logs", "file"] });
    };

    return (
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-4" aria-label="Runtime log browser">
            <div className="flex flex-wrap items-end gap-3">
                <Field className="min-w-0 flex-1 sm:max-w-sm">
                    <FieldLabel htmlFor={fieldId}>
                        Log file
                    </FieldLabel>
                    <FilterSelect
                        id={fieldId}
                        label="Log file"
                        placeholder="No log files"
                        className="w-full min-w-0"
                        disabled={files.length === 0}
                        value={selectedFileName ?? null}
                        onChange={setRequestedFileName}
                        options={files.map(file => ({ label: file.fileName, value: file.fileName }))}
                    />
                </Field>
                <LoadingButton
                    variant="outline"
                    onClick={refreshLogs}
                    icon={<RefreshCw data-icon="inline-start"/>}
                    isLoading={isRefreshingFiles || fileQuery.isFetching}
                >
                    Refresh
                </LoadingButton>
            </div>

            {isFilesRefreshError &&
                <InlineErrorContainer>
                    The log file list could not be refreshed. Showing the last loaded files.
                </InlineErrorContainer>
            }

            <div className="flex flex-wrap items-center justify-between gap-3">
                <ToggleGroup
                    multiple
                    size="sm"
                    variant="brand"
                    value={enabledLevels}
                    className="flex-wrap"
                    aria-label="Log levels"
                    onValueChange={levels => setEnabledLevels(levels as LogLevel[])}
                >
                    {logLevels.map(level =>
                        <ToggleGroupItem
                            key={level}
                            value={level}
                            aria-label={`${level} logs`}
                            className="gap-2 capitalize"
                        >
                            {level}
                            <span className="text-xs tabular-nums text-muted-foreground">
                                {levelCounts.get(level) ?? 0}
                            </span>
                        </ToggleGroupItem>
                    )}
                </ToggleGroup>

                {enabledLevels.length !== logLevels.length &&
                    <Button variant="ghost" size="sm" onClick={() => setEnabledLevels(logLevels)}>
                        Show all levels
                    </Button>
                }
            </div>

            {fileInfo &&
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <p>
                        {formatBytes(fileInfo.sizeBytes)}
                        {" · Updated "}
                        {formatDateTime(fileInfo.modifiedAt, { seconds: true })}
                    </p>
                    {fileQuery.data &&
                        <p className="tabular-nums">
                            {visibleEntries.length} of {entries.length} entries · Latest at the bottom
                        </p>
                    }
                </div>
            }

            {!selectedFileName ?
                <EmptyState
                    className="py-14"
                    icon={ServerCrash}
                    message="No runtime log files found. Refresh to check for new files."
                />
                :
                !selectedFile.canRead ?
                    <InlineErrorContainer>
                        This file exceeds the dashboard size limit. Choose a smaller log file.
                    </InlineErrorContainer>
                    :
                    fileQuery.isLoading ?
                        <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Spinner aria-label="Loading log entries"/>
                            Loading log entries…
                        </div>
                        :
                        fileQuery.isError ?
                            <InlineErrorContainer>
                                {fileQuery.error.message}
                            </InlineErrorContainer>
                            :
                            entries.length === 0 ?
                                <EmptyState
                                    icon={FileIcon}
                                    className="py-14"
                                    message="This log file is empty."
                                />
                                : visibleEntries.length === 0 ?
                                    <EmptyState
                                        icon={FileX}
                                        className="py-14"
                                        message="No log entries match the selected levels. Choose a level or show all levels."
                                    />
                                    :
                                    <VirtualLogViewer
                                        entries={visibleEntries}
                                        scrollKey={`${selectedFileName}:${enabledLevels.join(",")}:${visibleEntries.length}`}
                                    />
            }
        </section>
    );
}
