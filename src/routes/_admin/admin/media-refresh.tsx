import {formatDate} from "@/lib/utils/formatting/date";
import {capitalize} from "@/lib/utils/formatting/text";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {adminRefreshSchema} from "@/lib/schemas/admin.schema";
import {BarChart3, Flame, RefreshCw, Users} from "lucide-react";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import type {AdminMediaRefreshStatsParams} from "@/lib/types/admin.types";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {adminMediaRefreshOptions} from "@/lib/client/react-query/query-options/admin.options";
import {MediaRefreshUsers} from "@/lib/client/components/admin/media-refresh/MediaRefreshUsers";
import {MediaRefreshCharts} from "@/lib/client/components/admin/media-refresh/MediaRefreshCharts";
import {MediaRefreshHistory} from "@/lib/client/components/admin/media-refresh/MediaRefreshHistory";


export const Route = createFileRoute("/_admin/admin/media-refresh")({
    validateSearch: adminRefreshSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        mediaRefreshQueryOptions: adminMediaRefreshOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.mediaRefreshQueryOptions, staleTime: "static" });
    },
    component: MediaRefreshPage,
});


function MediaRefreshPage() {
    const navigate = Route.useNavigate();
    const { mediaRefreshQueryOptions } = Route.useRouteContext();
    const data = useSuspenseQuery(mediaRefreshQueryOptions).data;

    const updateFilters = (params: AdminMediaRefreshStatsParams) => {
        void navigate({ search: prev => ({ ...prev, ...params }), resetScroll: false });
    };

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={RefreshCw}
                eyebrow="Administration"
                title="Metadata refreshes"
                description="Monitor metadata refresh activity across the catalog and the accounts contributing to it."
            />
            <section className="my-6 rounded-xl border p-5 shadow-xs sm:p-6" aria-label="All-time refresh statistics">
                <CompactStatsGrid columns={4} items={[
                    {
                        label: "Total refreshes",
                        icon: <RefreshCw className="size-4"/>,
                        value: formatNumber(data.summary.total),
                    },
                    {
                        label: "Contributing accounts",
                        icon: <Users className="size-4"/>,
                        value: formatNumber(data.summary.uniqueUsers),
                    },
                    {
                        label: "Avg. per day",
                        icon: <BarChart3 className="size-4"/>,
                        value: formatNumber(data.summary.avgPerDay),
                    },
                    {
                        icon: <Flame className="size-4"/>,
                        value: formatDate(data.summary.busiestDay),
                        label: `Busiest day: ${formatNumber(data.summary.busiestCount)} refreshes`,
                    },
                    ...data.totalsByRole.map(row => ({
                        value: formatNumber(row.count),
                        icon: <Users className="size-4"/>,
                        label: `Contrib. ${capitalize(row.role)}`,
                        note: `${formatNumber(row.userCount)} ${row.userCount === 1 ? "account" : "accounts"}`,
                    }))
                ]}/>
            </section>
            <MediaRefreshCharts
                data={data}
                onRangeChange={dailyRange => updateFilters({ dailyRange })}
            />
            <MediaRefreshUsers
                data={data}
                onRangeChange={topRange => updateFilters({ topRange })}
            />
            <MediaRefreshHistory
                history={data.recentRefreshes}
                onPageChange={recentPage => updateFilters({ recentPage })}
            />
        </DashboardShell>
    );
}
