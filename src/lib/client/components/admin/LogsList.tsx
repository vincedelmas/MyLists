import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {TaskLog} from "@/lib/types/tasks.types";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {AlertTriangle, ChevronDown, XCircle} from "lucide-react";


export function LogsList({ logs }: { logs: TaskLog[] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-medium mb-2 hover:text-foreground/80 transition-colors"
            >
                <ChevronDown
                    className={cn("size-4 transition-transform", !isExpanded && "-rotate-90")}
                />
                Warnings & Errors ({logs.length})
            </button>
            {isExpanded &&
                <div className="border rounded-md divide-y max-h-100 overflow-auto scrollbar-thin">
                    {logs.map((log, i) => {
                        const isError = log.level === "error";
                        const Icon = isError ? XCircle : AlertTriangle;

                        return (
                            <div key={i} className="p-2 flex items-start gap-2 text-sm">
                                <Icon
                                    className={cn("size-4 mt-0.5 shrink-0", isError ? "text-destructive" : "text-yellow-500")}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {formatDateTime(log.time, { seconds: true })}
                                        </span>
                                        {log.step &&
                                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {log.step}
                                            </span>
                                        }
                                    </div>
                                    <p className={cn(isError ? "text-destructive" : "text-yellow-400")}>
                                        {log.message}
                                    </p>
                                    {log.data &&
                                        <pre className="text-xs mt-1 text-muted-foreground overflow-auto">
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
