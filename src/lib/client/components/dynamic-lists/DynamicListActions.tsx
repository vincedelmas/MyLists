import type z from "zod";
import {Link} from "@tanstack/react-router";
import {PencilLine, Trash2} from "lucide-react";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import type {dynamicListSearchSchema} from "@/lib/schemas/dynamic-lists.schema";
import {ProfilePinMenuItem} from "@/lib/client/components/lists/ProfilePinMenuItem";
import {DropdownMenuGroup, DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";
import type {DynamicListRecord} from "@/lib/client/react-query/query-options/dynamic-lists.options";
import {useDeleteDynamicListMutation} from "@/lib/client/react-query/query-mutations/dynamic-lists.mutations";


interface DynamicListActionsProps {
    onDeleted?: () => void;
    view: Pick<DynamicListRecord, "id" | "spec">;
    search?: z.infer<typeof dynamicListSearchSchema>;
}


export const DynamicListActions = ({ view, search = { page: 1 }, onDeleted }: DynamicListActionsProps) => {
    const confirm = useConfirm();
    const deleteMutation = useDeleteDynamicListMutation();
    const loading = useDelayedLoading(deleteMutation.isPending);

    return (
        <DropdownMenuGroup>
            <ProfilePinMenuItem item={{ kind: "dynamic", id: view.id, title: view.spec.title }}/>
            <DropdownMenuItem
                render={
                    <Link
                        search={search}
                        params={{ listId: view.id }}
                        to="/lists/dynamic/$listId/edit"
                    />
                }
            >
                <PencilLine/>
                <span>Edit dynamic list</span>
            </DropdownMenuItem>
            <DropdownMenuItem
                closeOnClick={false}
                variant="destructive"
                disabled={deleteMutation.isPending || loading}
                aria-busy={deleteMutation.isPending || loading}
                onClick={async () => {
                    if (!await confirm({
                        variant: "destructive",
                        confirmLabel: "Delete list",
                        title: "Delete this dynamic list?",
                        onConfirm: () => deleteMutation.mutateAsync(view.id),
                        description: "This dynamic list will be deleted. The titles in your tracking lists stay as they are.",
                    })) return;

                    onDeleted?.();
                }}
            >
                {loading ? <Spinner/> : <Trash2/>}
                <span>Delete dynamic list</span>
            </DropdownMenuItem>
        </DropdownMenuGroup>
    );
};
