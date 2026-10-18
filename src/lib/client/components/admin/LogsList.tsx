import {useId, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import type {TaskLog} from "@/lib/types/tasks.types";
import {Button} from "@/lib/client/components/ui/button";
import {formatDateTime} from "@/lib/utils/formatting/date";
import {AlertTriangle, ChevronDown, Info, XCircle} from "lucide-react";


const logLevels = {
    info: {
        icon: Info,
        color: "text-muted-foreground",
    },
    warn: {
        icon: AlertTriangle,
        color: "text-warning",
    },
    error: {
        icon: XCircle,
        color: "text-destructive",
    },
};


export function LogsList({ logs }: { logs: TaskLog[] }) {
    const contentId = useId();
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="min-w-0">
            <Button
                size="sm"
                variant="ghost"
                className="mb-2"
                aria-expanded={isExpanded}
                aria-controls={contentId}
                onClick={() => setIsExpanded(current => !current)}
            >
                <ChevronDown
                    data-icon="inline-start"
                    className={isExpanded ? undefined : "-rotate-90"}
                />
                Logs ({logs.length})
            </Button>
            {isExpanded &&
                <div id={contentId} className="max-h-100 divide-y overflow-auto rounded-lg border scrollbar-thin">
                    {logs.map((log, index) => {
                        const config = logLevels[log.level];
                        const Icon = config.icon;

                        return (
                            <div key={index} className="flex items-start gap-2 p-3 text-sm">
                                <Icon
                                    aria-label={log.level}
                                    className={cn("mt-0.5 size-4 shrink-0", config.color)}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {formatDateTime(log.time, { seconds: true })}
                                        </span>
                                        {log.step &&
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs wrap-break-word">
                                                {log.step}
                                            </span>
                                        }
                                    </div>
                                    <p className={cn("wrap-break-word whitespace-pre-wrap", config.color)}>
                                        {log.message}
                                    </p>
                                    {log.data &&
                                        <pre className="mt-1 overflow-auto text-xs text-muted-foreground">
                                            {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
            }
        </div>
    );
}
