import {Clock} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {getMonthlyActivityStatSummary} from "@/lib/utils/activity-utils";
import {monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";


interface MonthlyActivityStatsProps {
    year: string;
    month: string;
    username: string;
    mediaType?: MediaType;
}


export function MonthlyActivityStats({ username, year, month, mediaType }: MonthlyActivityStatsProps) {
    const stats = useSuspenseQuery(monthlyActivityStatsOptions(username, { year, month, mediaType })).data;

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            <div className="flex min-h-20 w-full min-w-0 flex-col justify-between rounded-lg border bg-background px-3 py-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <Clock className="text-app-accent" size={15}/>
                        <span className="truncate text-sm font-medium capitalize">
                        Monthly Time
                    </span>
                    </div>
                </div>
                <div className="text-lg font-semibold">
                    {formatMinutes(stats.totalTime)}
                </div>
            </div>

            {stats.mediaStats.map((stat) => {
                const summary = getMonthlyActivityStatSummary(stat.mediaType, stat.specificTotal, stat.count);

                return (
                    <div key={stat.mediaType} className="flex min-h-20 w-full min-w-0 flex-col justify-between rounded-lg border bg-background px-3 py-2">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <MainThemeIcon type={stat.mediaType} size={15}/>
                                <span className="truncate text-sm font-medium capitalize">
                                    {stat.mediaType}
                                </span>
                            </div>
                            {summary &&
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {summary}
                                </span>
                            }
                        </div>
                        <div className="text-lg font-semibold">
                            {formatMinutes(stat.timeGained)}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
