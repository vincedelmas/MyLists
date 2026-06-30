import {Trash2} from "lucide-react";
import authClient from "@/lib/utils/auth-client";
import {useQueryClient} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {authOptions} from "@/lib/client/react-query/query-options";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {useDeleteAccountMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/danger")({
    component: DangerForm,
});


function DangerForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const deleteAccountMutation = useDeleteAccountMutation();

    const onSubmit = async () => {
        const firstConfirm = window.confirm("Are you sure?");
        if (!firstConfirm) return;

        const secondConfirm = window.confirm("All your data will be permanently deleted. Are you really sure?");
        if (!secondConfirm) return;

        deleteAccountMutation.mutate(undefined, {
            onSuccess: async () => {
                await authClient.signOut();
                queryClient.setQueryData(authOptions.queryKey, null);
                await navigate({ to: "/", replace: true });
                queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authOptions.queryKey[0] });
            }
        });
    };

    return (
        <div className="h-fit max-w-125 rounded-xl border border-red-900/30 bg-red-950/10 p-6">
            <div className="flex flex-col gap-5">
                <div>
                    <h3 className="text-base font-bold text-destructive">
                        Delete Account
                    </h3>
                    <p className="text-sm text-red-200/60 mt-1">
                        Permanently remove your account and all associated data.
                        This action is not reversible, so please continue with caution.
                    </p>
                </div>
                <Button variant="destructive" onClick={onSubmit} className="w-fit">
                    <Trash2 className="size-4"/>
                    Delete Account
                </Button>
            </div>
        </div>
    );
}
