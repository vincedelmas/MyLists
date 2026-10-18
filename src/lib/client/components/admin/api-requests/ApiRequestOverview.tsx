import {formatDate, formatDateTime} from "@/lib/utils/formatting/date";
import {formatMs, formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import type {AdminApiRequestsData} from "@/lib/client/react-query/query-options/admin.options";
import {Activity, AlertTriangle, BarChart3, Calendar, Clock, Gauge, Radio, Timer} from "lucide-react";


export function ApiRequestOverview({ summary }: { summary: AdminApiRequestsData["summary"] }) {
    const errorRate = summary.total ? summary.failed / summary.total * 100 : 0;

    const requestsPerSecond = summary.avgPerSecond > 0 && summary.avgPerSecond < 0.0001
        ? "<0.0001"
        : formatNumber(summary.avgPerSecond, { maximumFractionDigits: 4 });

    return (
        <section className="my-6 rounded-xl border p-5 shadow-xs sm:p-6" aria-label="All-time API request statistics">
            <CompactStatsGrid
                columns={6}
                items={[
                    {
                        note: "All time",
                        label: "Total requests",
                        icon: <Radio className="size-4"/>,
                        value: formatNumber(summary.total),
                    },
                    {
                        label: "Avg. per day",
                        note: "Since monitoring began",
                        icon: <BarChart3 className="size-4"/>,
                        value: formatNumber(summary.avgPerDay, { maximumFractionDigits: 1 }),
                    },
                    {
                        label: "Avg. per second",
                        value: requestsPerSecond,
                        note: "Since monitoring began",
                        icon: <Gauge className="size-4"/>,
                    },
                    {
                        label: "Peak per second",
                        note: "Highest provider burst",
                        icon: <Activity className="size-4"/>,
                        value: formatNumber(summary.busiestSecondCount),
                    },
                    {
                        label: "Failed requests",
                        value: formatNumber(summary.failed),
                        icon: <AlertTriangle className="size-4"/>,
                        note: `${formatPercent(errorRate)} failure rate`,
                    },
                    {
                        label: "Avg. latency",
                        note: "Across all providers",
                        icon: <Clock className="size-4"/>,
                        value: formatMs(summary.avgDurationMs),
                    },
                    {
                        label: "Busiest day",
                        note: formatDate(summary.busiestDay),
                        icon: <Calendar className="size-4"/>,
                        value: formatNumber(summary.busiestDayCount),
                    },
                    {
                        label: "Busiest minute",
                        icon: <Timer className="size-4"/>,
                        note: formatDateTime(summary.busiestMinute),
                        value: formatNumber(summary.busiestMinuteCount),
                    },
                    {
                        label: "Peak provider burst / sec",
                        icon: <Activity className="size-4"/>,
                        note: formatDateTime(summary.busiestSecond),
                        value: formatNumber(summary.busiestSecondCount),
                    },
                ]}
            />
        </section>
    );
}
