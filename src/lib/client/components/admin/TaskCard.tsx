import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {TaskResult} from "@/lib/types/tasks.types";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {LogsList} from "@/lib/client/components/admin/LogsList";
import {StepsList} from "@/lib/client/components/admin/StepsList";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {formatMs} from "@/lib/utils/number-formatting";
import {AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Trash, XCircle} from "lucide-react";
import {useAdminDeleteTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


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
        badge: "bg-green-500",
        color: "text-green-500",
    },
    partial: {
        icon: AlertTriangle,
        badge: "bg-yellow-500",
        color: "text-yellow-500",
    },
    failed: {
        icon: XCircle,
        badge: "bg-destructive",
        color: "text-destructive",
    },
} as const;


export function TaskCard({ task }: TaskCardProps) {
    const { logs } = task;
    const deleteTaskMutation = useAdminDeleteTaskMutation();
    const [isExpanded, setIsExpanded] = useState(false);

    const config = statusConfig[logs.status];
    const StatusIcon = config.icon;

    const failedSteps = logs.steps.filter((s) => s.status === "failed").length;
    const completedSteps = logs.steps.filter((s) => s.status === "completed").length;

    return (
        <Card className="max-w-3xl">
            <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <StatusIcon className={cn("size-5", config.color)}/>
                    <CardTitle>{logs.taskName}</CardTitle>
                    {isExpanded ?
                        <ChevronDown className="size-4 text-muted-foreground"/>
                        :
                        <ChevronRight className="size-4 text-muted-foreground"/>
                    }
                </div>
                <CardAction>
                    <div className="flex items-center gap-3">
                        <Badge className={cn(config.badge)}>
                            {capitalize(logs.status)}
                        </Badge>
                        <Button
                            size="xs"
                            variant="destructive"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                deleteTaskMutation.mutate({ data: { taskId: task.taskId } });
                            }}
                        >
                            <Trash className="size-4"/>
                        </Button>
                    </div>
                </CardAction>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            Duration
                        </span>
                        <span className="font-mono">
                            {formatMs(logs.durationMs)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            Steps
                        </span>
                        <span>
                            <span className="text-green-500">
                                {completedSteps}
                            </span>
                            {" / "}{logs.steps.length}
                            {failedSteps > 0 &&
                                <>{" "}
                                    (<span className="text-destructive">
                                        {failedSteps} failed
                                    </span>)
                                </>
                            }
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">Triggered</span>
                        <span>{logs.triggeredBy}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">Started</span>
                        <span className="font-mono text-xs">
                            {formatDateTime(logs.startedAt, { seconds: true })}
                        </span>
                    </div>
                </div>

                {logs.errorMessage &&
                    <div className="mt-4 p-3 bg-destructive/50 rounded-md">
                        <p className="text-sm text-destructive-foreground font-mono">
                            {logs.errorMessage}
                        </p>
                    </div>
                }

                {isExpanded &&
                    <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                        {logs.logs.length > 0 &&
                            <LogsList
                                logs={logs.logs}
                            />
                        }
                        {logs.steps.length > 0 &&
                            <StepsList
                                steps={logs.steps}
                            />
                        }
                    </div>
                }
            </CardContent>
        </Card>
    );
}
