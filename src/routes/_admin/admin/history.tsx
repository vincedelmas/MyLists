import {History} from "lucide-react";
import {searchTypeSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminAllUpdatesOptions} from "@/lib/client/react-query/query-options/admin.options";
import {UpdateHistoryTable} from "@/lib/client/components/admin/update-history/UpdateHistoryTable";


export const Route = createFileRoute("/_admin/admin/history")({
    validateSearch: searchTypeSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        adminHistoryQueryOptions: adminAllUpdatesOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.adminHistoryQueryOptions, staleTime: "static" });
    },
    component: AdminGlobalHistory,
});


function AdminGlobalHistory() {
    const filters = Route.useSearch();
    const { adminHistoryQueryOptions } = Route.useRouteContext();
    const history = useSuspenseQuery(adminHistoryQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={History}
                title="Update history"
                eyebrow="Administration"
                asideValue={formatNumber(history.total)}
                asideLabel={filters.search ? "Matching updates" : "Recorded updates"}
                description="Review media list changes across all accounts, including status and progress updates."
            />
            <UpdateHistoryTable
                history={history}
                filters={filters}
            />
        </DashboardShell>
    );
}
