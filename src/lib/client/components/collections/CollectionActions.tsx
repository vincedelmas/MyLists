import {Link} from "@tanstack/react-router";
import {PencilLine, Trash2} from "lucide-react";
import type {CommunitySearch} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {ProfilePinMenuItem} from "@/lib/client/components/lists/ProfilePinMenuItem";
import {DropdownMenuGroup, DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";
import type {CollectionSummaryData} from "@/lib/client/react-query/query-options";
import {useDeleteCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


interface CollectionActionsProps {
    fromCommunity?: CommunitySearch;
    onDeleted?: () => void;
    collection: Pick<CollectionSummaryData, "id" | "title" | "ownerId" | "ownerName">;
    capabilities: CollectionSummaryData["capabilities"];
}


export const CollectionActions = ({ collection, capabilities, fromCommunity, onDeleted }: CollectionActionsProps) => {
    const { currentUser } = useAuth();
    const confirm = useConfirm();
    const deleteMutation = useDeleteCollectionMutation(collection.id);
    const isOwner = currentUser?.id === collection.ownerId;

    if (!isOwner && !capabilities.edit && !capabilities.delete) return null;

    return (
        <DropdownMenuGroup>
            {isOwner &&
                <ProfilePinMenuItem item={{ kind: "collection", id: collection.id, title: collection.title }}/>
            }
            {capabilities.edit &&
                <DropdownMenuItem
                    render={
                        <Link
                            to="/lists/collections/$collectionId/edit"
                            params={{ collectionId: collection.id }}
                            search={{ fromCommunity }}
                        />
                    }
                >
                    <PencilLine/>
                    <span>Edit collection</span>
                </DropdownMenuItem>
            }
            {capabilities.delete &&
                <DropdownMenuItem
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={async () => {
                        if (!await confirm({
                            variant: "destructive",
                            title: "Delete this collection?",
                            confirmLabel: "Delete collection",
                            description: "This collection will be permanently deleted.",
                        })) return;

                        try {
                            await deleteMutation.mutateAsync({ data: { collectionId: collection.id } });
                        } catch {
                            return;
                        }
                        onDeleted?.();
                    }}
                >
                    {deleteMutation.isPending ? <Spinner/> : <Trash2/>}
                    <span>Delete collection</span>
                </DropdownMenuItem>
            }
        </DropdownMenuGroup>
    );
};
