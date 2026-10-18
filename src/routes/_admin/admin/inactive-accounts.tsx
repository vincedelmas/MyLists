import {History} from "lucide-react";
import {searchTypeSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {InactiveAccountStats} from "@/lib/client/components/admin/inactive-accounts/InactiveAccountStats";
import {inactiveAccountDeletionsAdminOptions} from "@/lib/client/react-query/query-options/admin.options";
import {InactiveAccountsTable} from "@/lib/client/components/admin/inactive-accounts/InactiveAccountsTable";


export const Route = createFileRoute("/_admin/admin/inactive-accounts")({
    validateSearch: searchTypeSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        inactiveAccountsQueryOptions: inactiveAccountDeletionsAdminOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.inactiveAccountsQueryOptions, staleTime: "static" });
    },
    component: InactiveAccountsPage,
});


function InactiveAccountsPage() {
    const filters = Route.useSearch();
    const { inactiveAccountsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(inactiveAccountsQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={History}
                eyebrow="Administration"
                title="Inactive accounts"
                asideValue={formatNumber(apiData.total)}
                asideLabel={filters.search ? "Matching records" : "Lifecycle records"}
                description="Monitor inactivity warnings, returning accounts, and automated account deletions."
            />
            <InactiveAccountStats
                stats={apiData.stats}
            />
            <InactiveAccountsTable
                apiData={apiData}
                filters={filters}
            />
        </DashboardShell>
    );
}
