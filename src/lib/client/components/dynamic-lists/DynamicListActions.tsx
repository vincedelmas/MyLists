import type z from "zod";
import {Link} from "@tanstack/react-router";
import {PencilLine, Trash2} from "lucide-react";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
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

    return (
        <DropdownMenuGroup>
            <ProfilePinMenuItem item={{ kind: "dynamic", id: view.id, title: view.spec.title }}/>
            <DropdownMenuItem
                render={<Link to="/lists/dynamic/$listId/edit" params={{ listId: view.id }} search={search}/>}
            >
                <PencilLine/>
                <span>Edit dynamic list</span>
            </DropdownMenuItem>
            <DropdownMenuItem
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={async () => {
                    if (!await confirm({
                        variant: "destructive",
                        confirmLabel: "Delete list",
                        title: "Delete this dynamic list?",
                        description: "This dynamic list will be deleted. The titles in your tracking lists stay as they are.",
                    })) return;

                    try {
                        await deleteMutation.mutateAsync(view.id);
                    } catch {
                        return;
                    }
                    onDeleted?.();
                }}
            >
                {deleteMutation.isPending ? <Spinner/> : <Trash2/>}
                <span>Delete dynamic list</span>
            </DropdownMenuItem>
        </DropdownMenuGroup>
    );
};
