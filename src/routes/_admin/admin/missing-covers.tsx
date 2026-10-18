import {ImageOff} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {adminMissingCoversSchema} from "@/lib/schemas/admin.schema";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminMissingCoversOptions} from "@/lib/client/react-query/query-options/admin.options";
import {MissingCoverDirectory} from "@/lib/client/components/admin/missing-covers/MissingCoverDirectory";


export const Route = createFileRoute("/_admin/admin/missing-covers")({
    validateSearch: adminMissingCoversSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        missingCoversQueryOptions: adminMissingCoversOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.missingCoversQueryOptions, staleTime: "static" });
    },
    component: MissingCoversPage,
});


function MissingCoversPage() {
    const filters = Route.useSearch();
    const { missingCoversQueryOptions } = Route.useRouteContext();
    const coversQuery = useSuspenseQuery(missingCoversQueryOptions);

    return (
        <DashboardShell>
            <PageHeader
                title="Missing covers"
                eyebrowIcon={ImageOff}
                eyebrow="Administration"
                asideValue={formatNumber(coversQuery.data.total)}
                asideLabel={filters.search || filters.mediaType ? "Matching media" : "Missing covers"}
                description="Restore catalog covers by refreshing metadata, adding an image link, or uploading a file."
            />
            <MissingCoverDirectory
                filters={filters}
                data={coversQuery.data}
                onRefresh={coversQuery.refetch}
                isRefreshError={coversQuery.isError}
                isRefreshing={coversQuery.isFetching}
            />
        </DashboardShell>
    );
}
