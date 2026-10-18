import {Link} from "@tanstack/react-router";
import {ExternalLink, RefreshCw} from "lucide-react";
import {capitalize} from "@/lib/utils/formatting/text";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {type ColumnDef, tableFeatures, useTable} from "@tanstack/react-table";
import type {AdminMediaRefreshData} from "@/lib/client/react-query/query-options/admin.options";


type RefreshHistory = AdminMediaRefreshData["recentRefreshes"];


interface MediaRefreshHistoryProps {
    history: RefreshHistory;
    onPageChange: (page: number) => void;
}


const features = tableFeatures({});


export function MediaRefreshHistory({ history, onPageChange }: MediaRefreshHistoryProps) {
    const columns: ColumnDef<typeof features, RefreshHistory["items"][number]>[] = [
        {
            header: "Media type",
            accessorKey: "mediaType",
            cell: ({ row: { original } }) => (
                <span className="flex items-center gap-2 capitalize">
                    <MainThemeIcon type={original.mediaType}/>
                    {original.mediaType}
                </span>
            ),
        },
        {
            header: "Account",
            accessorKey: "name",
            cell: ({ row: { original } }) => (
                <Link
                    to="/profile/$username"
                    params={{ username: original.name }}
                    className="font-medium hover:underline underline-offset-4"
                >
                    {original.name}
                </Link>
            ),
        },
        {
            header: "Role",
            accessorKey: "role",
            cell: ({ row: { original } }) => capitalize(original.role)
        },
        {
            accessorKey: "apiId",
            header: "Media details",
            cell: ({ row: { original } }) => (
                <Link
                    to="/details/$mediaType/external/$apiId"
                    className="flex items-center gap-2 hover:underline underline-offset-4"
                    params={{ mediaType: original.mediaType, apiId: String(original.apiId) }}
                >
                    #{original.apiId}
                    <ExternalLink className="size-3.5" aria-hidden="true"/>
                </Link>
            ),
        },
        {
            header: "Refreshed",
            accessorKey: "refreshedAt",
            cell: ({ row: { original } }) => <RelativeTime date={original.refreshedAt}/>
        },
    ];

    const table = useTable({ features, columns, data: history.items });

    return (
        <section className="mb-6 flex min-w-0 flex-col gap-4" aria-label="Recent metadata refreshes">
            <SectionHeader
                title="Recent refreshes"
                description="Latest metadata refreshes across all accounts and media types, independent of the periods above."
            />
            <DataTable
                table={table}
                ariaLabel="Recent metadata refreshes"
                emptyMessage={
                    <EmptyState
                        icon={RefreshCw}
                        className="py-4"
                        message="No metadata refreshes recorded yet."
                    />
                }
            />
            <Pagination
                currentPage={history.page}
                totalPages={history.pages}
                onChangePage={onPageChange}
            />
        </section>
    );
}
