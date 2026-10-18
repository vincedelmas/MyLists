import {Upload} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {adminImportsSchema} from "@/lib/schemas/admin.schema";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {ImportDirectory} from "@/lib/client/components/admin/imports/ImportDirectory";
import {adminImportsOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/imports")({
    validateSearch: adminImportsSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        importsQueryOptions: adminImportsOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.importsQueryOptions, staleTime: "static" });
    },
    component: AdminImportsPage,
});


function AdminImportsPage() {
    const filters = Route.useSearch();
    const { importsQueryOptions } = Route.useRouteContext();
    const history = useSuspenseQuery(importsQueryOptions);

    return (
        <DashboardShell>
            <PageHeader
                title="Imports"
                eyebrowIcon={Upload}
                eyebrow="Administration"
                asideValue={formatNumber(history.data.total)}
                asideLabel={filters.search || filters.status ? "Matching imports" : "Import jobs"}
                description="Monitor imports across all accounts, processing times, and rows that need attention."
            />
            <ImportDirectory
                filters={filters}
                history={history.data}
                onRefresh={history.refetch}
                isRefreshError={history.isError}
                isRefreshing={history.isFetching}
            />
        </DashboardShell>
    );
}
