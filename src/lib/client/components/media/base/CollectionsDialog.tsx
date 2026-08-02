import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import React, {useId, useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {displayContainerError} from "@/lib/utils/error-display";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ChevronRight, Folder, PlusCircle} from "lucide-react";
import {userCollectionMembershipsOptions} from "@/lib/client/react-query/query-options";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle, CredenzaTrigger} from "@/lib/client/components/ui/credenza";
import {useAddMediaToCollectionMutation, useCreateCollectionMutation, useRemoveMediaFromCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


interface CollectionsDialogProps {
    mediaId: number;
    mediaType: MediaType;
}


export const CollectionsDialog = ({ mediaType, mediaId }: CollectionsDialogProps) => {
    const fieldId = useId();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const createMutation = useCreateCollectionMutation({ noErrorToast: true });
    const addMutation = useAddMediaToCollectionMutation(mediaType, mediaId, { noErrorToast: true });
    const removeMutation = useRemoveMediaFromCollectionMutation(mediaType, mediaId, { noErrorToast: true });

    const isPending = addMutation.isPending || removeMutation.isPending || createMutation.isPending;
    const { data: collections = [], isLoading } = useQuery(userCollectionMembershipsOptions(mediaId, mediaType, isOpen));

    const activeIds = new Set(collections.filter((col) => col.hasMedia).map((col) => col.id));
    const filteredCollections = collections.filter((col) => col.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const showCreateButton = searchQuery.trim().length >= 3
        && !collections.some((col) => col.title.toLowerCase() === searchQuery.trim().toLowerCase());

    const handleCreate = () => {
        createMutation.mutate({
            data: {
                mediaType,
                ordered: false,
                description: "",
                items: [{ mediaId }],
                title: searchQuery.trim(),
                privacy: PrivacyType.PRIVATE,
            }
        }, {
            onSuccess: async () => {
                setSearchQuery("");
                await queryClient.invalidateQueries({ queryKey: userCollectionMembershipsOptions(mediaId, mediaType, isOpen).queryKey });
            },
        });
    };

    const handleToggle = (collection: NonNullable<typeof collections>[number]) => {
        const selectedMutation = activeIds.has(collection.id) ? removeMutation : addMutation;
        selectedMutation.mutate({ data: { mediaId, mediaType, collectionId: collection.id } });
    };

    const onSearchKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter" && showCreateButton) {
            handleCreate();
        }
    };

    return (
        <Credenza open={isOpen} onOpenChange={setIsOpen}>
            <CredenzaTrigger className="-mb-1 text-sm font-medium text-muted-foreground hover:text-brand">
                Manage
            </CredenzaTrigger>
            <CredenzaContent
                className="w-100 p-0 overflow-hidden bg-popover shadow-2xl max-sm:w-full"
                onEscapeKeyDown={(ev) => {
                    if (searchQuery.length > 0) {
                        ev.preventDefault();
                        setSearchQuery("");
                    }
                }}
            >
                <div className="p-6 pb-4">
                    <CredenzaHeader className="p-0 mb-6 mt-2">
                        <CredenzaTitle>
                            Manage Collections
                        </CredenzaTitle>
                        <CredenzaDescription>
                            Add this {mediaType} to your own collections.
                        </CredenzaDescription>
                    </CredenzaHeader>

                    <div className="relative group">
                        <Input
                            autoFocus
                            value={searchQuery}
                            disabled={isLoading}
                            onKeyDown={onSearchKeyDown}
                            className="h-9 bg-popover/50"
                            placeholder="Find or create a collection..."
                            onChange={(ev) => setSearchQuery(ev.target.value)}
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 flex items-center">
                            {showCreateButton ?
                                <Button
                                    size="sm"
                                    disabled={isPending}
                                    onClick={handleCreate}
                                    className="text-[10px]"
                                >
                                    {createMutation.isPending ? "..." : "CREATE"}
                                </Button>
                                :
                                <div className="px-2 py-1 rounded bg-popover/50 border text-[10px] text-muted-foreground font-mono tracking-tighter">
                                    ESC
                                </div>
                            }
                        </div>
                    </div>
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
                                        const isActive = activeIds.has(collection.id);

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
                                                    <div className="min-w-0 space-y-1">
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
                            to="/collections/user/$username"
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
            </CredenzaContent>
        </Credenza>
    );
};
