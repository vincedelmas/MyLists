import {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {createFileRoute, Link} from "@tanstack/react-router";
import {SimpleSearch, simpleSearchSchema} from "@/lib/schemas";
import {Payload} from "@/lib/client/components/general/Payload";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {allUpdatesOptions} from "@/lib/client/react-query/query-options";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {useDeleteAllUpdatesMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {ColumnDef, rowPaginationFeature, rowSelectionFeature, RowSelectionState, tableFeatures, useTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/history")({
    validateSearch: simpleSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        return queryClient.ensureQueryData(allUpdatesOptions(username, search));
    },
    component: AllUpdates,
});


const features = tableFeatures({ rowPaginationFeature, rowSelectionFeature });


function AllUpdates() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const isCurrent = (currentUser?.name === username);
    const [rowSelected, setRowSelected] = useState<RowSelectionState>({});
    const deleteUpdateMutation = useDeleteAllUpdatesMutation(username, filters);
    const apiData = useSuspenseQuery(allUpdatesOptions(username, filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SimpleSearch>({
        search: filters.search ?? "", options: { resetScroll: false }
    });

    const { pagination, onPaginationChange } = useTablePagination({
        pageSize: 25,
        page: filters.page,
        onPageChange: (page) => updateFilters({ page }),
    });

    const deleteSelectedRows = async () => {
        const selectedIds = Object.keys(rowSelected).map((key) => table.getRow(key).original.id);
        await deleteUpdateMutation.mutateAsync({ data: { updateIds: selectedIds } });
        setRowSelected({});
    };

    const columns: ColumnDef<typeof features, typeof apiData.items[number]>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <>
                    {isCurrent &&
                        <Checkbox
                            aria-label="Select all"
                            checked={table.getIsAllPageRowsSelected()}
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(value)}
                            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                        />
                    }
                </>
            ),
            cell: ({ row }) => (
                <>
                    {isCurrent &&
                        <Checkbox
                            aria-label="Select row"
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(value)}
                        />
                    }
                </>
            ),
        },
        {
            accessorKey: "mediaName",
            header: "Name",
            cell: ({ row: { original } }) => {
                return (
                    <div className="flex items-center gap-3">
                        <MainThemeIcon
                            size={15}
                            type={original.mediaType}
                        />
                        <Link
                            to="/details/$mediaType/$mediaId"
                            params={{ mediaType: original.mediaType, mediaId: original.mediaId }}
                        >
                            {original.mediaName}
                        </Link>
                    </div>
                );
            },
        },
        {
            accessorKey: "update",
            header: "Update",
            cell: ({ row }) => <Payload update={row.original}/>,
        },
        {
            accessorKey: "timestamp",
            header: "Date",
            cell: ({ row }) => <RelativeTime date={row.original.timestamp}/>,
        },
    ];

    const table = useTable({
        columns,
        onPaginationChange,
        manualPagination: true,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        features,
        onRowSelectionChange: setRowSelected,
        state: { rowSelection: rowSelected, pagination },
    });

    return (
        <PageTitle title="History" subtitle={isCurrent ? "All of your media feeds." : `All the feeds of ${username}.`}>
            <div className="w-full max-w-5xl mx-auto mt-4">
                <div className="flex justify-between items-center pb-3">
                    <div className="flex items-center gap-2">
                        <SearchInput
                            className="w-55"
                            value={localSearch}
                            onChange={handleInputChange}
                            placeholder="Search by name..."
                        />
                    </div>
                    {(isCurrent && Object.keys(rowSelected).length !== 0) &&
                        <Button
                            onClick={deleteSelectedRows}
                            disabled={Object.keys(rowSelected).length === 0 || deleteUpdateMutation.isPending}
                        >
                            Delete Selected
                        </Button>
                    }
                </div>
                <DataTable
                    table={table}
                    getIsRowSelected={(row) => row.getIsSelected()}
                    getRowClassName={(row) => deleteUpdateMutation.isPending && row.getIsSelected() ? "opacity-50" : undefined}
                />
                <div className="mt-3">
                    <TablePagination
                        table={table}
                        selectedRowCount={table.getSelectedRowModel().rows.length}
                    />
                </div>
            </div>
        </PageTitle>
    );
}
