import {capitalize} from "@/lib/utils/formatting/text";
import {formatDate} from "@/lib/utils/formatting/date";
import {formatNumber} from "@/lib/utils/formatting/number";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {apiRequestRangeOptions} from "@/lib/client/components/admin/monitoring-options";
import type {AdminApiRequestsData} from "@/lib/client/react-query/query-options/admin.options";


interface ApiRequestTrafficProps {
    data: AdminApiRequestsData;
    colors: Map<string, string>;
    onRangeChange: (value: AdminApiRequestsData["dailyRange"]) => void;
}


export function ApiRequestTraffic({ data, colors, onRangeChange }: ApiRequestTrafficProps) {
    return (
        <ChartCard
            height={300}
            title="Daily requests"
            emptyMessage="No API requests in this period."
            hasData={data.daily.some(row => row.count > 0)}
            description="Daily outbound requests stacked by provider."
            action={
                <FilterSelect
                    value={data.dailyRange}
                    onChange={onRangeChange}
                    label="Daily request period"
                    options={apiRequestRangeOptions.filter(option => option.value !== "24h")}
                />
            }
        >
            <DataBarChart
                x="date"
                y="count"
                z="provider"
                height={300}
                barInset={0}
                integerYTicks
                mode="stacked"
                data={data.daily}
                seriesOrder={data.providers}
                tooltipSeriesFormatter={capitalize}
                tooltipValueFormatter={formatNumber}
                ariaLabel="Daily API requests by provider"
                xFormatter={value => formatDate(String(value))}
                fill={({ provider }) => colors.get(provider)!}
                tooltipTitleFormatter={value => formatDate(String(value))}
            />
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Provider legend">
                {data.providers.map(provider =>
                    <span key={provider} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                        <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: colors.get(provider) }}
                        />
                        {provider}
                    </span>
                )}
            </div>
        </ChartCard>
    );
}
