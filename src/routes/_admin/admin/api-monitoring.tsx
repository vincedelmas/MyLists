import {Radio} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {adminApiMonitoringSchema} from "@/lib/schemas/admin.schema";
import type {AdminApiMonitoringParams} from "@/lib/types/admin.types";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminApiMonitoringOptions} from "@/lib/client/react-query/query-options/admin.options";
import {ApiRequestHistory} from "@/lib/client/components/admin/api-requests/ApiRequestHistory";
import {ApiRequestTraffic} from "@/lib/client/components/admin/api-requests/ApiRequestTraffic";
import {ApiRequestOverview} from "@/lib/client/components/admin/api-requests/ApiRequestOverview";
import {ApiRequestProviders} from "@/lib/client/components/admin/api-requests/ApiRequestProviders";


export const Route = createFileRoute("/_admin/admin/api-monitoring")({
    validateSearch: adminApiMonitoringSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        apiMonitoringQueryOptions: adminApiMonitoringOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.apiMonitoringQueryOptions, staleTime: "static" });
    },
    component: ApiMonitoringPage,
});


const providerColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--games)",
    "var(--movies)",
    "var(--books)",
];


function ApiMonitoringPage() {
    const navigate = Route.useNavigate();
    const { apiMonitoringQueryOptions } = Route.useRouteContext();
    const data = useSuspenseQuery(apiMonitoringQueryOptions).data;

    const colors = new Map(data.providers.map((provider, index) => [
        provider,
        providerColors[index % providerColors.length],
    ]));

    const updateFilters = (params: AdminApiMonitoringParams) => {
        void navigate({ search: prev => ({ ...prev, ...params }), resetScroll: false });
    };

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={Radio}
                title="API requests"
                eyebrow="Administration"
                description="Monitor outbound provider requests, latency, failures, and traffic peaks."
            />
            <ApiRequestOverview
                summary={data.summary}
            />
            <ApiRequestTraffic
                data={data}
                colors={colors}
                onRangeChange={dailyRange => updateFilters({ dailyRange })}
            />
            <ApiRequestProviders
                data={data}
                colors={colors}
                onRangeChange={range => updateFilters({ range })}
            />
            <ApiRequestHistory
                history={data.recentCalls}
                onPageChange={recentPage => updateFilters({ recentPage })}
            />
        </DashboardShell>
    );
}
