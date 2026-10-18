import {useId, useState} from "react";
import {TaskResult} from "@/lib/types/tasks.types";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatMs} from "@/lib/utils/formatting/number";
import {capitalize} from "@/lib/utils/formatting/text";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {formatDateTime} from "@/lib/utils/formatting/date";
import {LogsList} from "@/lib/client/components/admin/LogsList";
import {StepsList} from "@/lib/client/components/admin/StepsList";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {formatTaskLabel} from "@/lib/client/components/admin/tasks/task-form.utils";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {useAdminDeleteTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {AlertTriangle, Calendar, CheckCircle, ChevronDown, Clock, List, Play, Trash, XCircle} from "lucide-react";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


type TaskCardProps = {
    task: {
        id: number;
        taskId: string;
        logs: TaskResult;
    };
};


const statusConfig = {
    completed: {
        icon: CheckCircle,
        variant: "success",
    },
    partial: {
        icon: AlertTriangle,
        variant: "warning",
    },
    failed: {
        icon: XCircle,
        variant: "destructive",
    },
} as const;


export function TaskCard({ task }: TaskCardProps) {
    const detailsId = useId();
    const confirm = useConfirm();
    const deleteTaskMutation = useAdminDeleteTaskMutation();
    const [isExpanded, setIsExpanded] = useState(false);

    const { logs } = task;
    const config = statusConfig[logs.status];

    const StatusIcon = config.icon;
    const taskLabel = formatTaskLabel(logs.taskName);
    const completedSteps = logs.steps.filter(step => step.status === "completed").length;

    const deleteRun = async () => {
        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Delete archived run",
            title: `Delete this ${taskLabel} run?`,
            description: "The archived record, logs, and step details for this run will be permanently removed.",
        })) return;

        deleteTaskMutation.mutate({ data: { taskId: task.taskId } });
    };

    return (
        <Card role="article" aria-label={`${taskLabel} run ${task.taskId}`} className="min-w-0">
            <CardHeader>
                <CardTitle className="min-w-0 wrap-break-word">
                    {taskLabel}
                </CardTitle>
                <CardDescription className="break-all text-xs">
                    Run ID: {task.taskId}
                </CardDescription>
                <CardAction>
                    <Badge variant={config.variant}>
                        <StatusIcon/>
                        {capitalize(logs.status)}
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
                <CompactStatsGrid
                    columns={4}
                    items={[
                        {
                            label: "Duration",
                            value: formatMs(logs.durationMs),
                            icon: <Clock className="size-4"/>,
                        },
                        {
                            label: "Steps completed",
                            icon: <List className="size-4"/>,
                            value: `${completedSteps} / ${logs.steps.length}`,
                        },
                        {
                            label: "Triggered by",
                            icon: <Play className="size-4"/>,
                            value: capitalize(logs.triggeredBy),
                        },
                        {
                            label: "Started",
                            icon: <Calendar className="size-4"/>,
                            value: <RelativeTime date={logs.startedAt} className="text-sm font-medium"/>,
                        },
                    ]}
                />
                {logs.errorMessage &&
                    <p className="rounded-lg bg-destructive/10 p-3 text-sm wrap-break-word whitespace-pre-wrap text-destructive">
                        {logs.errorMessage}
                    </p>
                }

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                        size="sm"
                        variant="outline"
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        onClick={() => setIsExpanded(current => !current)}
                    >
                        <ChevronDown
                            data-icon="inline-start"
                            className={isExpanded ? undefined : "-rotate-90"}
                        />
                        {isExpanded ? "Hide run details" : "View run details"}
                    </Button>
                    <LoadingButton
                        size="sm"
                        variant="outline"
                        onClick={deleteRun}
                        className="text-destructive"
                        isLoading={deleteTaskMutation.isPending}
                        icon={<Trash data-icon="inline-start"/>}
                    >
                        Delete run
                    </LoadingButton>
                </div>
                {isExpanded &&
                    <div id={detailsId} className="flex min-w-0 flex-col gap-6 border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                            Finished {formatDateTime(logs.finishedAt, { seconds: true })}
                        </p>

                        {logs.logs.length > 0 &&
                            <LogsList logs={logs.logs}/>
                        }

                        {logs.steps.length > 0 &&
                            <StepsList steps={logs.steps}/>
                        }

                        {logs.logs.length === 0 && logs.steps.length === 0 &&
                            <EmptyState
                                icon={List}
                                className="py-4"
                                message="No logs or steps recorded for this run."
                            />
                        }
                    </div>
                }
            </CardContent>
        </Card>
    );
}
