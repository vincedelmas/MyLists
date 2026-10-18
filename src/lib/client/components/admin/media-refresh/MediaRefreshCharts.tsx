import {getThemeColor} from "@/lib/client/theme";
import {capitalize} from "@/lib/utils/formatting/text";
import {formatDate} from "@/lib/utils/formatting/date";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {mediaRefreshRangeOptions} from "@/lib/client/components/admin/monitoring-options";
import type {AdminMediaRefreshData} from "@/lib/client/react-query/query-options/admin.options";


interface MediaRefreshChartsProps {
    data: AdminMediaRefreshData;
    onRangeChange: (value: AdminMediaRefreshData["dailyRange"]) => void;
}


export function MediaRefreshCharts({ data, onRangeChange }: MediaRefreshChartsProps) {
    const countsByType = new Map(data.totalsByType.map(row => [row.mediaType, row.count]));
    const mediaTypes = ALL_MEDIA_TYPES.map(mediaType => ({ mediaType, count: countsByType.get(mediaType) ?? 0 }));

    return (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)]">
            <ChartCard
                height={300}
                title="Daily refreshes"
                hasData={data.daily.some(row => row.count > 0)}
                emptyMessage="No metadata refreshes in this period."
                description="Refresh activity stacked by media type."
                action={
                    <FilterSelect
                        value={data.dailyRange}
                        onChange={onRangeChange}
                        label="Daily refresh period"
                        options={mediaRefreshRangeOptions}
                    />
                }
            >
                <DataBarChart
                    x="date"
                    y="count"
                    height={300}
                    barInset={0}
                    z="mediaType"
                    mode="stacked"
                    data={data.daily}
                    integerYTicks={true}
                    seriesOrder={ALL_MEDIA_TYPES}
                    tooltipSeriesFormatter={capitalize}
                    tooltipValueFormatter={formatNumber}
                    ariaLabel="Daily refreshes by media type"
                    xFormatter={value => formatDate(String(value))}
                    fill={({ mediaType }) => getThemeColor(mediaType)}
                    tooltipTitleFormatter={value => formatDate(String(value))}
                    tooltipSeriesIcon={mt => <MainThemeIcon type={mt as typeof ALL_MEDIA_TYPES[number]}/>}
                />
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Media type legend">
                    {ALL_MEDIA_TYPES.map(mediaType =>
                        <span key={mediaType} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                            <MainThemeIcon type={mediaType} size={14}/>
                            {mediaType}
                        </span>
                    )}
                </div>
            </ChartCard>
            <ChartCard
                height={300}
                title="Refreshes by media type"
                hasData={data.summary.total > 0}
                emptyMessage="No metadata refreshes recorded yet."
                description="All-time refresh volume across the catalog."
                summary={mediaTypes.map(row => ({ label: capitalize(row.mediaType), value: formatNumber(row.count) }))}
            >
                <DataBarChart
                    y="count"
                    height={300}
                    x="mediaType"
                    data={mediaTypes}
                    integerYTicks={true}
                    ariaLabel="All-time refreshes by media type"
                    xFormatter={value => capitalize(String(value))}
                    fill={({ mediaType }) => getThemeColor(mediaType)}
                    tooltipValueFormatter={val => `${formatNumber(val)} (${formatPercent(val / data.summary.total * 100)})`}
                />
            </ChartCard>
        </div>
    );
}
