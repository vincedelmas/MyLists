import {Users} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {searchTypeSchema, type AdminUpdatePayload} from "@/lib/schemas";
import {UserPrompts} from "@/lib/client/components/admin/users/UserPrompts";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {UserDirectory} from "@/lib/client/components/admin/users/UserDirectory";
import {userAdminOptions, type AdminUser} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminImpersonateUserMutation, useAdminUpdateUserMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


export const Route = createFileRoute("/_admin/admin/users")({
    validateSearch: searchTypeSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        usersQueryOptions: userAdminOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.usersQueryOptions, staleTime: "static" });
    },
    component: UserManagementPage,
});


function UserManagementPage() {
    const confirm = useConfirm();
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { completeSignIn } = useAuth();
    const { usersQueryOptions } = Route.useRouteContext();

    const apiData = useSuspenseQuery(usersQueryOptions).data;
    const impersonateMutation = useAdminImpersonateUserMutation();
    const updateUserMutation = useAdminUpdateUserMutation(filters);

    const isPending = updateUserMutation.isPending || impersonateMutation.isPending;
    const globalPayload = updateUserMutation.isPending && updateUserMutation.variables?.data.userId === undefined
        ? updateUserMutation.variables?.data.payload : undefined;

    const updateUser = async (user: AdminUser, payload: AdminUpdatePayload) => {
        if (payload.deleteUser && !await confirm({
            requireText: "DELETE",
            variant: "destructive",
            confirmLabel: "Delete user",
            title: `Delete ${user.name}?`,
            description: "This account and its related data will be permanently removed.",
        })) return;

        updateUserMutation.mutate({ data: { userId: user.id, payload } }, {
            onSuccess: () => {
                const page = filters.page ?? 1;
                if (payload.deleteUser && apiData.items.length === 1 && page > 1) {
                    void navigate({ search: prev => ({ ...prev, page: page - 1 }), replace: true, resetScroll: false });
                }
            },
        });
    };

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={Users}
                title="User management"
                eyebrow="Administration"
                asideValue={formatNumber(apiData.total)}
                asideLabel={filters.search ? "Matching accounts" : "Accounts"}
                description="Manage accounts, profile privacy, access roles, and product prompts."
            />
            <UserPrompts
                isPending={isPending}
                onUpdate={payload => updateUserMutation.mutate({ data: { payload } })}
                pendingPrompt={globalPayload?.showUpdateModal
                    ? "news"
                    : globalPayload?.showOnboarding
                        ? "onboarding"
                        : undefined
                }
            />
            <UserDirectory
                apiData={apiData}
                filters={filters}
                isPending={isPending}
                onUpdateUser={updateUser}
                onImpersonate={user => impersonateMutation.mutate({ data: { userId: user.id } }, {
                    onSuccess: () => {
                        return completeSignIn(`/profile/${encodeURIComponent(user.name)}`);
                    }
                })}
            />
        </DashboardShell>
    );
}
