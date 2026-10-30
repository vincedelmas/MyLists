import {useId, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {ChevronRight, Folder} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {DialogRootChangeEventDetails} from "@base-ui/react";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {Dialog, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {useMutationFeedback} from "@/lib/client/hooks/use-mutation-feedback";
import {userCollectionMembershipsOptions} from "@/lib/client/react-query/query-options";
import {SaveFeedbackIndicator} from "@/lib/client/components/general/SaveFeedbackIndicator";
import {MembershipSearchInput} from "@/lib/client/components/media/base/MembershipSearchInput";
import {MembershipDialogContent} from "@/lib/client/components/media/base/MembershipDialogContent";
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

    const latestMutation = [addMutation, removeMutation, createMutation]
        .reduce((latest, mutation) => mutation.submittedAt > latest.submittedAt ? mutation : latest);

    const feedback = useMutationFeedback(latestMutation, true);
    const isPending = feedback.pending;
    const { data: collections = [], isLoading, error: collectionsError } = useQuery(userCollectionMembershipsOptions(mediaId, mediaType, isOpen));

    const query = searchQuery.trim().toLowerCase();
    const waiting = isPending && !feedback.loading && !collectionsError;
    const filteredCollections = collections.filter(collection => collection.title.toLowerCase().includes(query));

    const showCreateButton = !collectionsError && !isLoading && query.length >= 3
        && !collections.some(collection => collection.title.toLowerCase() === query);

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
            <MembershipDialogContent
                isLoading={isLoading}
                title="Manage Collections"
                emptyTitle="No collection found"
                description={<>Add this {mediaType} to your own collections.</>}
                error={collectionsError ?? addMutation.error ?? removeMutation.error ?? createMutation.error}
                emptyDescription={searchQuery.trim().length > 0 && searchQuery.trim().length < 3
                    ? "Use at least 3 characters to create a collection."
                    : searchQuery
                        ? `Click 'create' to create '${searchQuery.trim()}'.`
                        : "Start typing to create your first collection."}
                search={
                    <div data-save-feedback={waiting ? "waiting" : undefined}>
                        <MembershipSearchInput
                            value={searchQuery}
                            onCreate={handleCreate}
                            onChange={setSearchQuery}
                            canCreate={showCreateButton}
                            placeholder="Find or create a collection..."
                            disabled={isLoading || isPending || !!collectionsError}
                            isCreating={feedback.loading && latestMutation === createMutation}
                        />
                    </div>
                }
                footer={
                    <>
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
                        <div className="flex items-center gap-2">
                            <SaveFeedbackIndicator {...feedback}/>
                            <Button size="sm" variant="secondary" onClick={() => setIsOpen(false)}>
                                Done
                            </Button>
                        </div>
                    </>
                }
            >
                {filteredCollections.map((collection, idx) => {
                    const checkboxId = `${fieldId}-${idx}`;
                    const isActive = collection.hasMedia;

                    return (
                        <Field
                            key={collection.id}
                            orientation="horizontal"
                            data-save-feedback={waiting ? "waiting" : undefined}
                            data-disabled={feedback.loading || !!collectionsError}
                            className={cn("rounded-lg p-3", isActive ? "bg-brand/4 text-brand" : "hover:bg-popover")}
                        >
                            <Checkbox
                                id={checkboxId}
                                checked={isActive}
                                disabled={isPending || !!collectionsError}
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
            </MembershipDialogContent>
        </Dialog>
    );
};
