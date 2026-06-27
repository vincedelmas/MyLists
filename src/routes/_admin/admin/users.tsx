import {toast} from "sonner";
import React from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {formatDate} from "@/lib/utils/date-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {PrivacyType, RoleType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {AdminUpdatePayload, SearchType} from "@/lib/schemas";
import {postImpersonateUser} from "@/lib/server/functions/admin";
import {useMutation, useSuspenseQuery} from "@tanstack/react-query";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {userAdminOptions} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminUpdateUserMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {CheckCircle, ChevronsUpDown, MoreHorizontal, Trash2, UserCheck, UserPen, UserX} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, PaginationState, SortingState, useReactTable} from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/lib/client/components/ui/dropdown-menu";


export const Route = createFileRoute("/_admin/admin/users")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(userAdminOptions(search));
    },
    component: UserManagementPage,
})


const DEFAULT = { search: "", page: 1, sorting: "updatedAt" } satisfies SearchType;


function UserManagementPage() {
    const filters = Route.useSearch();
    const { setCurrentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { search = DEFAULT.search } = filters;
    const updateUserMutation = useAdminUpdateUserMutation(filters);
    const apiData = useSuspenseQuery(userAdminOptions(filters)).data;
    const impersonateMutation = useMutation({ mutationFn: postImpersonateUser });
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search });
    const sortingState = [{ id: filters?.sorting ?? DEFAULT.sorting, desc: filters?.sortDesc === true }];
    const paginationState = { pageIndex: filters?.page ? (filters.page - 1) : 0, pageSize: filters.perPage ?? 25 };

    const onPaginationChange: OnChangeFn<PaginationState> = async (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        updateFilters({ page: newPagination.pageIndex + 1 });
    };

    const onSortingChange: OnChangeFn<SortingState> = async (updaterOrValue) => {
        const newSorting = typeof updaterOrValue === "function" ? updaterOrValue(sortingState) : updaterOrValue;
        updateFilters({ sorting: newSorting[0]?.id ?? "updatedAt", sortDesc: newSorting[0]?.desc ?? true, page: 1 });
    };

    const updateUser = (userId: number | undefined, payload: AdminUpdatePayload) => {
        if (payload.deleteUser && !window.confirm("Are you sure you want to delete this user?")) return;
        updateUserMutation.mutate({ data: { userId, payload } });
    };

    const impersonateUser = (userId: number, username: string) => {
        impersonateMutation.mutate({ data: { userId } }, {
            onError: (error) => toast.error(error.message),
            onSuccess: async () => {
                await setCurrentUser();
                await navigate({ to: "/profile/$username", params: { username } });
            },
        });
    };

    const usersColumns: ColumnDef<typeof apiData.items[0]>[] = [
        {
            accessorKey: "id",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Id <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                );
            },
            cell: ({ row: { original } }) => <div>{original.id}</div>,
        },
        {
            accessorKey: "privacy",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Privacy <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => <PrivacyIcon type={original.privacy} className="size-3.5"/>,
        },
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Username <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => {
                return (
                    <div className="flex items-center gap-3">
                        <ProfileIcon
                            fallbackSize="text-sm"
                            className="size-9 border-2"
                            user={{ image: original.image, name: original.name }}
                        />
                        <div>
                            <div>
                                <Link
                                    to="/profile/$username"
                                    params={{ username: original.name }}
                                    className="hover:underline hover:underline-offset-2"
                                >
                                    {original.name}
                                </Link>
                            </div>
                            <p className="text-sm text-gray-500">
                                {original.email}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Registered <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => formatDate(original.createdAt),
        },
        {
            accessorKey: "updatedAt",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Last Seen <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => formatDate(original.updatedAt),
        },
        {
            accessorKey: "showUpdateModal",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Flags <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => {
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground w-12">
                                News:
                            </span>
                            {original.showUpdateModal ?
                                <Badge variant="outline" className="text-green-600 py-0 h-4 text-[10px]">
                                    Enabled
                                </Badge>
                                :
                                <Badge variant="outline" className="text-red-500 py-0 h-4 text-[10px]">
                                    Disabled
                                </Badge>
                            }
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground w-12">
                                Tuto:
                            </span>
                            {original.showOnboarding ?
                                <Badge variant="outline" className="text-green-600 py-0 h-4 text-[10px]">
                                    Enabled
                                </Badge>
                                :
                                <Badge variant="outline" className="text-red-500 py-0 h-4 text-[10px]">
                                    Disabled
                                </Badge>
                            }
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "role",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Role <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => {
                switch (original.role) {
                    case RoleType.ADMIN:
                        return <Badge variant="outline" className="text-cyan-600">Admin</Badge>
                    case RoleType.MANAGER:
                        return <Badge variant="outline" className="text-yellow-600">Manager</Badge>
                    case RoleType.USER:
                    default:
                        return <Badge variant="outline" className="text-green-600">User</Badge>
                }
            },
        },
        {
            accessorKey: "emailVerified",
            header: ({ column }) => {
                return (
                    <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                        Active <ChevronsUpDown className="size-3 text-muted-foreground"/>
                    </Button>
                )
            },
            cell: ({ row: { original } }) => {
                return original.emailVerified ?
                    <Badge variant="outline" className="text-green-600">Yes</Badge>
                    :
                    <Badge variant="outline" className="text-red-600">No</Badge>
            },
        },
        {
            id: "actions",
            header: () => <span className="text-xs">Actions</span>,
            enableSorting: false,
            cell: ({ row: { original } }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="size-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="size-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                            Actions for {" "}
                            <span className="text-yellow-500">{original.name}</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem onClick={() => impersonateUser(original.id, original.name)}>
                            <UserPen className="size-4"/>
                            <span>Impersonate </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUser(original.id, { emailVerified: !original.emailVerified })}>
                            {original.emailVerified ?
                                <>
                                    <UserX className="size-4"/>
                                    <span>Disable account</span>
                                </>
                                :
                                <>
                                    <UserCheck className="size-4"/>
                                    <span>Enable account</span>
                                </>
                            }
                        </DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuLabel>Features Settings</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={original.showUpdateModal}
                            onCheckedChange={() => updateUser(original.id, { showUpdateModal: !original.showUpdateModal })}
                        >
                            Update Modal
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={original.showOnboarding}
                            onCheckedChange={() => updateUser(original.id, { showOnboarding: !original.showOnboarding })}
                        >
                            Onboarding
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuLabel>Privacy Settings</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={original.privacy === PrivacyType.PUBLIC}
                            onCheckedChange={() => updateUser(original.id, { privacy: PrivacyType.PUBLIC })}
                        >
                            Public
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={original.privacy === PrivacyType.RESTRICTED}
                            onCheckedChange={() => updateUser(original.id, { privacy: PrivacyType.RESTRICTED })}
                        >
                            Restricted
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={original.privacy === PrivacyType.PRIVATE}
                            onCheckedChange={() => updateUser(original.id, { privacy: PrivacyType.PRIVATE })}
                        >
                            Private
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuLabel>Role Settings</DropdownMenuLabel>
                        {Object.values(RoleType).map((role) =>
                            <DropdownMenuCheckboxItem
                                key={role}
                                className="capitalize"
                                checked={original.role === role}
                                onCheckedChange={() => updateUser(original.id, { role })}
                            >
                                {role}
                            </DropdownMenuCheckboxItem>
                        )}
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onSelect={() => updateUser(original.id, { deleteUser: true })}
                        >
                            <Trash2 className="mr-2 size-4"/>
                            <span>Delete user</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }
    ];

    const table = useReactTable({
        enableSorting: true,
        manualSorting: true,
        columns: usersColumns,
        manualFiltering: true,
        manualPagination: true,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        onSortingChange: onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        onPaginationChange: onPaginationChange,
        state: { pagination: paginationState, sorting: sortingState },
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="User Management"
                description="View and manage all users on your platform."
            />
            <div className="flex items-center justify-between mb-3 max-sm:flex-col max-sm:items-start max-sm:justify-center max-sm:gap-2">
                <SearchInput
                    className="w-63"
                    value={localSearch}
                    onChange={handleInputChange}
                    placeholder="Search users..."
                />
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => updateUser(undefined, { showUpdateModal: true })}>
                        <CheckCircle className="size-4"/> Activate Update Modal
                    </Button>
                    <Button variant="outline" onClick={() => updateUser(undefined, { showOnboarding: true })}>
                        <CheckCircle className="size-4"/> Activate Onboarding
                    </Button>
                </div>
            </div>
            <div className="rounded-md border p-3 pt-0 overflow-x-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) =>
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header =>
                                    <TableHead key={header.id}>
                                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                )}
                            </TableRow>
                        )}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ?
                            table.getRowModel().rows.map((row) => {
                                return (
                                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                        {row.getVisibleCells().map((cell) =>
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                            :
                            <TableRow>
                                <TableCell colSpan={usersColumns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        }
                    </TableBody>
                </Table>
            </div>
            <div className="mt-3">
                <TablePagination
                    table={table}
                    withSelection={false}
                />
            </div>
        </DashboardShell>
    )
}
