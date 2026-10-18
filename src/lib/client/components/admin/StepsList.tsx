import {useId, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {TaskStep} from "@/lib/types/tasks.types";
import {formatMs} from "@/lib/utils/formatting/number";
import {Button} from "@/lib/client/components/ui/button";
import {AlertTriangle, CheckCircle, ChevronDown, SkipForward, XCircle} from "lucide-react";


const stepStatusConfig = {
    failed: {
        icon: XCircle,
        color: "text-destructive",
    },
    completed: {
        icon: CheckCircle,
        color: "text-success",
    },
    partial: {
        icon: AlertTriangle,
        color: "text-warning",
    },
    skipped: {
        icon: SkipForward,
        color: "text-muted-foreground",
    },
};


export const StepsList = ({ steps }: { steps: TaskStep[] }) => {
    return (
        <div>
            <div className="divide-y max-h-250 overflow-auto scrollbar-thin pr-3">
                {steps.map((step) =>
                    <StepItem
                        step={step}
                        key={`${step.startedAt}-${step.name}`}
                    />
                )}
            </div>
        </div>
    );
};


interface StepItemProps {
    step: TaskStep;
    depth?: number;
    defaultExpanded?: boolean;
}


const StepItem = ({ step, depth = 0, defaultExpanded = false }: StepItemProps) => {
    const childrenId = useId();
    const config = stepStatusConfig[step.status];

    const Icon = config.icon;
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const hasChildren = step.children && step.children.length > 0;

    return (
        <div>
            <div className={cn("p-3 flex items-center gap-3", depth > 0 && "border-l-2 border-muted ml-4 pl-4")}>
                {hasChildren ?
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-expanded={isExpanded}
                        aria-controls={childrenId}
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${step.name} substeps`}
                        className="shrink-0 hover:bg-muted rounded p-0.5 -m-0.5 transition-colors"
                    >
                        <ChevronDown className={cn("size-4 transition-transform", !isExpanded && "-rotate-90")}/>
                    </Button>
                    :
                    <div className="size-4 shrink-0"/>
                }
                <Icon className={cn("size-4 mt-0.5 shrink-0", config.color)}/>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={cn("font-medium text-sm wrap-break-word", depth === 0 && "text-base")}>
                            {step.name}
                        </span>
                        <div className="flex items-center gap-2">
                            {hasChildren &&
                                <span className="text-xs text-muted-foreground">
                                    {step.children!.length} sub-step
                                    {step.children!.length !== 1 && "s"}
                                    &nbsp; -
                                </span>
                            }
                            <span className="text-xs text-muted-foreground font-mono">
                                {formatMs(step.durationMs)}
                            </span>
                        </div>
                    </div>

                    {step.error &&
                        <p className="mt-1 font-mono text-xs wrap-break-word whitespace-pre-wrap text-destructive">
                            {step.error}
                        </p>
                    }

                    {Object.keys(step.metrics).length > 0 &&
                        <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(step.metrics).map(([key, value]) =>
                                <span key={key} className="text-xs bg-muted px-2 py-0.5 rounded">
                                    {key}:{" "}
                                    <span className="font-mono">
                                        {value}
                                    </span>
                                </span>
                            )}
                        </div>
                    }
                </div>
            </div>

            {hasChildren && isExpanded &&
                <div id={childrenId} className="ml-4">
                    {step.children!.map((child) =>
                        <StepItem
                            step={child}
                            depth={depth + 1}
                            key={`${child.startedAt}-${child.name}`}
                        />
                    )}
                </div>
            }
        </div>
    );
};
