import {RoleType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {capitalize} from "@/lib/utils/formatting/text";
import {formatDate} from "@/lib/utils/formatting/date";
import {Badge} from "@/lib/client/components/ui/badge";
import type {AdminUpdatePayload, SearchType} from "@/lib/schemas";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {CheckCircle, Newspaper, Sparkles, UserX} from "lucide-react";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import type {ColumnDef, OnChangeFn, SortingState} from "@tanstack/react-table";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {UserActionsMenu} from "@/lib/client/components/admin/users/UserActionsMenu";
import {SortableColumnHeader} from "@/lib/client/components/general/SortableColumnHeader";
import type {AdminUser, AdminUsersData} from "@/lib/client/react-query/query-options/admin.options";
import {rowPaginationFeature, rowSortingFeature, tableFeatures, useTable} from "@tanstack/react-table";


interface UserDirectoryProps {
    isPending: boolean;
    filters: SearchType;
    apiData: AdminUsersData;
    onImpersonate: (user: AdminUser) => void;
    onUpdateUser: (user: AdminUser, payload: AdminUpdatePayload) => void;
}


const features = tableFeatures({ rowPaginationFeature, rowSortingFeature });
const DEFAULT = { search: "", page: 1, sorting: "updatedAt" } satisfies SearchType;


export function UserDirectory({ apiData, filters, isPending, onUpdateUser, onImpersonate }: UserDirectoryProps) {
    const { search = DEFAULT.search } = filters;
    const sortingState = [{ id: filters.sorting ?? DEFAULT.sorting, desc: filters.sortDesc ?? true }];
    const { localSearch, setLocalSearch, handleInputChange, updateFilters } = useSearchNavigate(filters, { resetScroll: false });

    const { pagination, onPaginationChange } = useTablePagination({
        page: filters.page,
        pageSize: filters.perPage ?? 25,
        onPageChange: page => updateFilters({ page }),
    });

    const onSortingChange: OnChangeFn<SortingState> = updater => {
        const sorting = typeof updater === "function" ? updater(sortingState) : updater;
        updateFilters({ sorting: sorting[0]?.id ?? DEFAULT.sorting, sortDesc: sorting[0]?.desc ?? true, page: 1 });
    };

    const columns: ColumnDef<typeof features, AdminUser>[] = [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    ID
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <span className="text-muted-foreground">
                    #{original.id}
                </span>
            ),
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Account
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <div className="flex min-w-0 items-center gap-3">
                    <ProfileIcon
                        user={original}
                        fallbackSize="text-sm"
                        className="size-9 shrink-0 border-2"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                        <Link
                            to="/profile/$username"
                            params={{ username: original.name }}
                            className="font-medium hover:underline underline-offset-4"
                        >
                            {original.name}
                        </Link>
                        <span className="max-w-56 truncate text-xs text-muted-foreground" title={original.email}>
                            {original.email}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "role",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Role
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <Badge variant={original.role === RoleType.ADMIN ? "info" : original.role === RoleType.MANAGER ? "achievement" : "secondary"}>
                    {capitalize(original.role)}
                </Badge>
            ),
        },
        {
            accessorKey: "privacy",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Privacy
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <span className="flex items-center gap-2">
                    <PrivacyIcon type={original.privacy}/>
                    {capitalize(original.privacy)}
                </span>
            ),
        },
        {
            accessorKey: "emailVerified",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Email
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <Badge variant={original.emailVerified ? "success" : "warning"}>
                    {original.emailVerified ? <CheckCircle/> : <UserX/>}
                    {original.emailVerified ? "Verified" : "Unverified"}
                </Badge>
            ),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Registered
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => formatDate(original.createdAt),
        },
        {
            accessorKey: "updatedAt",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Last seen
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => <RelativeTime date={original.updatedAt}/>,
        },
        {
            accessorKey: "showUpdateModal",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Pending prompts
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <div className="flex flex-col items-start gap-1">
                    {original.showUpdateModal &&
                        <Badge variant="outline">
                            <Newspaper/> News
                        </Badge>
                    }
                    {original.showOnboarding &&
                        <Badge variant="outline">
                            <Sparkles/> Onboarding
                        </Badge>
                    }
                    {!original.showUpdateModal && !original.showOnboarding &&
                        <span className="text-xs text-muted-foreground">
                            None
                        </span>
                    }
                </div>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            enableSorting: false,
            cell: ({ row: { original } }) => (
                <UserActionsMenu
                    user={original}
                    disabled={isPending}
                    onUpdate={payload => onUpdateUser(original, payload)}
                    onImpersonate={() => {
                        setLocalSearch(search);
                        onImpersonate(original);
                    }}
                />
            ),
        },
    ];

    const table = useTable({
        features,
        columns,
        onSortingChange,
        onPaginationChange,
        enableSorting: true,
        manualSorting: true,
        data: apiData.items,
        manualPagination: true,
        rowCount: apiData.total,
        state: { pagination, sorting: sortingState },
    });

    return (
        <section className="mb-6 flex min-w-0 flex-col gap-4" aria-label="Account directory">
            <SectionHeader
                title="Account directory"
                description="Open an account’s menu to manage its settings or sign in as that user."
            />
            <SearchInput
                value={localSearch}
                onChange={handleInputChange}
                className="w-full sm:max-w-80"
                placeholder="Search by username…"
                aria-label="Search users by username"
            />
            <DataTable
                table={table}
                ariaLabel="User accounts"
                emptyMessage="No users match your search."
            />
            <TablePagination
                table={table}
            />
        </section>
    );
}
