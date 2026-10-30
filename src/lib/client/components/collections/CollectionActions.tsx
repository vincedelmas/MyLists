import {Link} from "@tanstack/react-router";
import {PencilLine, Trash2} from "lucide-react";
import type {CommunitySearch} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import type {CollectionSummaryData} from "@/lib/client/react-query/query-options";
import {ProfilePinMenuItem} from "@/lib/client/components/lists/ProfilePinMenuItem";
import {DropdownMenuGroup, DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";
import {useDeleteCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


interface CollectionActionsProps {
    onDeleted?: () => void;
    fromCommunity?: CommunitySearch;
    capabilities: CollectionSummaryData["capabilities"];
    collection: Pick<CollectionSummaryData, "id" | "title" | "ownerId" | "ownerName">;
}


export const CollectionActions = ({ collection, capabilities, fromCommunity, onDeleted }: CollectionActionsProps) => {
    const confirm = useConfirm();
    const { currentUser } = useAuth();
    const deleteMutation = useDeleteCollectionMutation(collection.id);

    const isOwner = currentUser?.id === collection.ownerId;
    const loading = useDelayedLoading(deleteMutation.isPending);

    if (!isOwner && !capabilities.edit && !capabilities.delete) {
        return null;
    }

    return (
        <DropdownMenuGroup>
            {isOwner &&
                <ProfilePinMenuItem
                    item={{
                        id: collection.id,
                        kind: "collection",
                        title: collection.title,
                    }}
                />
            }
            {capabilities.edit &&
                <DropdownMenuItem
                    render={
                        <Link
                            search={{ fromCommunity }}
                            params={{ collectionId: collection.id }}
                            to="/lists/collections/$collectionId/edit"
                        />
                    }
                >
                    <PencilLine/>
                    <span>Edit collection</span>
                </DropdownMenuItem>
            }
            {capabilities.delete &&
                <DropdownMenuItem
                    closeOnClick={false}
                    variant="destructive"
                    disabled={deleteMutation.isPending || loading}
                    aria-busy={deleteMutation.isPending || loading}
                    onClick={async () => {
                        if (!await confirm({
                            variant: "destructive",
                            title: "Delete this collection?",
                            confirmLabel: "Delete collection",
                            description: "This collection will be permanently deleted.",
                            onConfirm: () => {
                                return deleteMutation.mutateAsync({ data: { collectionId: collection.id } });
                            },
                        })) {
                            return;
                        }

                        onDeleted?.();
                    }}
                >
                    {loading ? <Spinner/> : <Trash2/>}
                    <span>Delete collection</span>
                </DropdownMenuItem>
            }
        </DropdownMenuGroup>
    );
};
