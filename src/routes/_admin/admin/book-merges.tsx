import {GitMerge} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {adminBookMergeSearchSchema} from "@/lib/schemas/admin.schema";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminBookMergeOptions} from "@/lib/client/react-query/query-options/admin.options";
import {BookMergeDirectory} from "@/lib/client/components/admin/book-merges/BookMergeDirectory";


export const Route = createFileRoute("/_admin/admin/book-merges")({
    validateSearch: adminBookMergeSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        bookMergeQueryOptions: adminBookMergeOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.bookMergeQueryOptions, staleTime: "static" });
    },
    component: BookMergesPage,
});


function BookMergesPage() {
    const filters = Route.useSearch();
    const { bookMergeQueryOptions } = Route.useRouteContext();
    const booksQuery = useSuspenseQuery(bookMergeQueryOptions);

    const { data } = booksQuery;

    const asideLabels = {
        authors: "Authors",
        duplicates: "Candidate groups",
        "author-books": "Books by this author",
        catalog: filters.search ? "Matching books" : "Catalog books",
    };

    return (
        <DashboardShell>
            <PageHeader
                title="Merge books"
                eyebrowIcon={GitMerge}
                eyebrow="Administration"
                asideLabel={asideLabels[data.kind]}
                asideValue={formatNumber(data.total)}
                description="Merge duplicate editions into one canonical Work. Users keep their edition details."
            />
            <BookMergeDirectory
                data={data}
                filters={filters}
                onRefresh={booksQuery.refetch}
                isRefreshError={booksQuery.isError}
                isRefreshing={booksQuery.isFetching}
            />
        </DashboardShell>
    );
}
