import {useId, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {DialogRootChangeEventDetails} from "@base-ui/react";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {ChevronRight, Folder, PlusCircle} from "lucide-react";
import {displayContainerError} from "@/lib/client/error-display";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {userCollectionMembershipsOptions} from "@/lib/client/react-query/query-options";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {MembershipSearchInput} from "@/lib/client/components/media/base/MembershipSearchInput";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {useAddMediaToCollectionMutation, useCreateCollectionMutation, useRemoveMediaFromCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


interface CollectionsDialogProps {
    mediaId: number;
    mediaType: MediaType;
}


export const CollectionsDialog = ({ mediaType, mediaId }: CollectionsDialogProps) => {
    const fieldId = useId();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const createMutation = useCreateCollectionMutation({ noErrorToast: true });
    const addMutation = useAddMediaToCollectionMutation({ noErrorToast: true });
    const removeMutation = useRemoveMediaFromCollectionMutation({ noErrorToast: true });

    const isPending = addMutation.isPending || removeMutation.isPending || createMutation.isPending;
    const { data: collections = [], isLoading } = useQuery(userCollectionMembershipsOptions(mediaId, mediaType, isOpen));

    const query = searchQuery.trim().toLowerCase();
    const filteredCollections = collections.filter(collection => collection.title.toLowerCase().includes(query));
    const showCreateButton = query.length >= 3 && !collections.some(collection => collection.title.toLowerCase() === query);

    const handleCreate = () => {
        createMutation.mutate({
            data: {
                ordered: false,
                description: "",
                title: searchQuery.trim(),
                privacy: PrivacyType.PRIVATE,
                items: [{ mediaId, mediaType }],
            }
        }, {
            onSuccess: () => {
                setSearchQuery("");
            },
        });
    };

    const handleToggle = (collection: NonNullable<typeof collections>[number]) => {
        const selectedMutation = collection.hasMedia ? removeMutation : addMutation;
        selectedMutation.mutate({ data: { mediaId, mediaType, collectionId: collection.id } });
    };

    const onOpenChange = (open: boolean, ev: DialogRootChangeEventDetails) => {
        if (!open && ev.reason === "escape-key" && searchQuery.length > 0) {
            ev.cancel();
            setSearchQuery("");
            return;
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger className="-mb-1 text-sm font-medium text-muted-foreground hover:text-brand">
                Manage
            </DialogTrigger>
            <DialogContent className="w-100 p-0 overflow-hidden bg-popover shadow-2xl max-sm:w-full">
                <div className="p-6 pb-4">
                    <DialogHeader className="p-0 mb-6 mt-2">
                        <DialogTitle>
                            Manage Collections
                        </DialogTitle>
                        <DialogDescription>
                            Add this {mediaType} to your own collections.
                        </DialogDescription>
                    </DialogHeader>

                    <MembershipSearchInput
                        value={searchQuery}
                        onCreate={handleCreate}
                        onChange={setSearchQuery}
                        canCreate={showCreateButton}
                        disabled={isLoading || isPending}
                        isCreating={createMutation.isPending}
                        placeholder="Find or create a collection..."
                    />
                </div>

                <div className="flex flex-col border-t bg-accent/20">
                    <div className="h-70 overflow-y-auto p-2 scrollbar-thin">
                        {isLoading ?
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                <Spinner className="size-6" aria-hidden="true"/>
                                <span className="text-xs font-medium">Syncing...</span>
                            </div>
                            : filteredCollections.length === 0 ?
                                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                    <PlusCircle className="size-8 text-muted-foreground mb-3 opacity-50"/>
                                    <p className="text-sm text-muted-foreground font-medium">
                                        No collection found
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        {searchQuery.trim().length > 0 && searchQuery.trim().length < 3
                                            ? "Use at least 3 characters to create a collection."
                                            : searchQuery
                                                ? `Click 'create' to create '${searchQuery.trim()}'.`
                                                : "Start typing to create your first collection."
                                        }
                                    </p>
                                </div>
                                :
                                <div className="grid gap-0.5">
                                    {filteredCollections.map((collection, idx) => {
                                        const checkboxId = `${fieldId}-${idx}`;
                                        const isActive = collection.hasMedia;

                                        return (
                                            <Field
                                                key={collection.id}
                                                orientation="horizontal"
                                                data-disabled={isPending}
                                                className={cn("rounded-lg p-3", isActive ? "bg-brand/4 text-brand" : "hover:bg-popover")}
                                            >
                                                <Checkbox
                                                    id={checkboxId}
                                                    checked={isActive}
                                                    disabled={isPending}
                                                    onCheckedChange={() => handleToggle(collection)}
                                                />
                                                <FieldLabel htmlFor={checkboxId} className="min-w-0 cursor-pointer">
                                                    <div className="flex min-w-0 flex-col gap-1">
                                                        <span className="font-medium line-clamp-2" title={collection.title}>
                                                            {collection.title}
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                                                            <PrivacyIcon type={collection.privacy}/>
                                                            {collection.itemsCount} item{collection.itemsCount > 1 ? "s" : ""}
                                                        </div>
                                                    </div>
                                                </FieldLabel>
                                            </Field>
                                        );
                                    })}
                                </div>
                        }
                    </div>

                    {(addMutation.isError || removeMutation.isError || createMutation.isError) &&
                        <div className="mb-3 mt-1 px-2">
                            <InlineErrorContainer>
                                {displayContainerError({ error: addMutation.error ?? removeMutation.error ?? createMutation.error })}
                            </InlineErrorContainer>
                        </div>
                    }

                    <div className="p-4 border-t flex items-center justify-between bg-popover">
                        <Link
                            to="/lists/$username"
                            search={{ kind: "collections" }}
                            params={{ username: currentUser!.name }}
                            className="flex items-center gap-1.5 text-xs text-foreground/90 hover:text-brand transition-colors"
                        >
                            <Folder className="size-3"/>
                            Open Collections
                            <ChevronRight className="size-3 mt-0.5"/>
                        </Link>
                        <Button size="sm" variant="secondary" onClick={() => setIsOpen(false)}>
                            Done
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
