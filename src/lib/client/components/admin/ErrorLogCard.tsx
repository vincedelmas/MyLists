import {useState} from "react";
import {Clock, Info, Trash} from "lucide-react";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {adminErrorLogsOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {useAdminDeleteErrorLogsMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


type ErrorLogType = Awaited<ReturnType<NonNullable<ReturnType<typeof adminErrorLogsOptions>["queryFn"]>>>["items"][number];


interface ErrorLogCardProps {
    errorLog: ErrorLogType;
    onDeleteMutation: ReturnType<typeof useAdminDeleteErrorLogsMutation>;
}


export function ErrorLogCard({ errorLog, onDeleteMutation }: ErrorLogCardProps) {
    const [showStack, setShowStack] = useState(false);

    const handleDeleteErrorLog = () => {
        onDeleteMutation.mutate({ data: { errorIds: [errorLog.id] } });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {errorLog.name}
                </CardTitle>
                <CardAction>
                    <div className="flex items-center gap-3">
                        <Button onClick={handleDeleteErrorLog} size="xs" variant="destructive">
                            <Trash className="size-4"/>
                        </Button>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                    <div className="flex flex-col gap-1">
                        <div className="text-zinc-400 flex items-center gap-1">
                            <Info className="size-3.5"/> Message
                        </div>
                        <div>
                            {errorLog.message}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="text-zinc-400 flex items-center gap-1">
                            <Clock className="size-3.5"/> Created At
                        </div>
                        <div>
                            {formatDateTime(errorLog.createdAt, { seconds: true })}
                        </div>
                    </div>
                </div>
                {errorLog.stack &&
                    <div className="mt-4">
                        <Button onClick={() => setShowStack(!showStack)} variant="outline" size="sm">
                            {showStack ? "Hide Stack" : "Show Stack"}
                        </Button>
                        {showStack &&
                            <div className="mt-2 p-2 bg-zinc-900 rounded text-xs font-mono overflow-auto">
                                <pre className="text-zinc-300 whitespace-pre-wrap wrap-break-word">
                                    {JSON.stringify(JSON.parse(errorLog.stack), null, 2)}
                                </pre>
                            </div>
                        }
                    </div>
                }
            </CardContent>
        </Card>
    );
}
