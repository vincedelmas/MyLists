import {Clock3} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {getMonthlyActivityStatSummary} from "@/lib/utils/activity-utils";
import {monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";


type ActivityStats = Awaited<ReturnType<NonNullable<ReturnType<typeof monthlyActivityStatsOptions>["queryFn"]>>>;


interface MonthlyActivityStatsProps {
    stats: ActivityStats;
    showTotalTime?: boolean;
}


export function MonthlyActivityStats({ stats, showTotalTime = true }: MonthlyActivityStatsProps) {
    if (stats.mediaStats.length === 0) return null;

    return (
        <section className="mt-4 rounded-xl border p-5 shadow-xs sm:p-6">
            <div className={cn("grid gap-5", showTotalTime && "lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-0")}>
                {showTotalTime &&
                    <div className="flex min-w-0 items-start gap-3 border-b pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
                        <Clock3 className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true"/>
                        <div className="min-w-0">
                            <div className="wrap-break-word text-xl font-black tabular-nums">
                                {formatMinutes(stats.totalTime)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Total time
                            </div>
                            <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground/80">
                                across all media
                            </div>
                        </div>
                    </div>
                }

                <div className={cn(showTotalTime && "lg:pl-5")}>
                    <CompactStatsGrid
                        columns={6}
                        items={stats.mediaStats.map((stat) => ({
                            label: capitalize(stat.mediaType),
                            value: formatMinutes(stat.timeGained),
                            icon: <MainThemeIcon type={stat.mediaType} size={16}/>,
                            note: getMonthlyActivityStatSummary(stat.mediaType, stat.progressTotal, stat.count),
                        }))}
                    />
                </div>
            </div>
        </section>
    );
}
