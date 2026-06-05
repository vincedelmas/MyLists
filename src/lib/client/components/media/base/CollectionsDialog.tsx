import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {cn} from "@/lib/utils/classnames";
import {displayContainerError} from "@/lib/utils/error-display";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {Check, ChevronRight, Folder, LoaderCircle, PlusCircle} from "lucide-react";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {userCollectionMembershipsOptions} from "@/lib/client/react-query/query-options";
import {Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle, CredenzaTrigger} from "@/lib/client/components/ui/credenza";
import {useAddMediaToCollectionMutation, useCreateCollectionMutation, useRemoveMediaFromCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


interface CollectionsDialogProps {
    mediaId: number;
    mediaType: MediaType;
}


export const CollectionsDialog = ({ mediaType, mediaId }: CollectionsDialogProps) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const createMutation = useCreateCollectionMutation({ noGlobalErrorToast: true });
    const addMutation = useAddMediaToCollectionMutation(mediaType, mediaId, { noGlobalErrorToast: true });
    const removeMutation = useRemoveMediaFromCollectionMutation(mediaType, mediaId, { noGlobalErrorToast: true });

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
            <CredenzaTrigger className="text-muted-foreground text-sm -mb-1">
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
                            className="h-11 bg-popover/50"
                            placeholder="Find or create a collection..."
                            onChange={(ev) => setSearchQuery(ev.target.value)}
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 flex items-center">
                            {showCreateButton ?
                                <Button
                                    size="sm"
                                    disabled={isPending}
                                    onClick={handleCreate}
                                    className="h-7 bg-app-accent/50 hover:bg-app-accent/70 text-[10px]
                                    font-bold px-2.5 rounded shadow-sm transition-all text-primary/90"
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
                                <LoaderCircle className="size-6 animate-spin"/>
                                <span className="text-xs font-medium">Syncing...</span>
                            </div>
                            : filteredCollections.length === 0 ?
                                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                    <PlusCircle className="size-8 text-muted-foreground mb-3 opacity-50"/>
                                    <p className="text-sm text-zinc-400 font-medium">
                                        No collection found
                                    </p>
                                    <p className="text-xs text-zinc-600 mt-1">
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
                                    {filteredCollections.map((collection) => {
                                        const isActive = activeIds.has(collection.id);

                                        return (
                                            <button
                                                key={collection.id}
                                                disabled={isPending}
                                                onClick={() => handleToggle(collection)}
                                                className={cn("flex items-center justify-between w-full px-3 py-3 " +
                                                    "rounded-lg text-sm transition-all group", isActive ?
                                                    "bg-app-accent/4 text-app-accent" : "text-primary/90 hover:bg-popover"
                                                )}
                                            >
                                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                                    <div className={cn("size-4.5 rounded border flex items-center " +
                                                        "justify-center transition-all shrink-0 mt-0.5", isActive
                                                        ? "bg-app-accent border-app-accent scale-110"
                                                        : "bg-popover group-hover:border-zinc-500",
                                                    )}>
                                                        {isActive &&
                                                            <Check className="size-3 text-popover stroke-4"/>
                                                        }
                                                    </div>
                                                    <div className="min-w-0 space-y-1 text-left">
                                                        <span className="font-medium line-clamp-2 leading-snug" title={collection.title}>
                                                            {collection.title}
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1 capitalize">
                                                                <PrivacyIcon type={collection.privacy}/>
                                                            </span>
                                                            <span>
                                                                {collection.itemsCount} item{collection.itemsCount > 1 ? "s" : ""}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isActive &&
                                                    <div className="ml-3 flex shrink-0 items-center gap-1.5 animate-in fade-in zoom-in-95">
                                                        <div className="size-1.5 rounded-full bg-app-accent"/>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">
                                                            active
                                                        </span>
                                                    </div>
                                                }
                                            </button>
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
                            className="flex items-center gap-1.5 text-xs text-primary/90 hover:text-app-accent transition-colors"
                        >
                            <Folder className="size-3"/>
                            Open Collections
                            <ChevronRight className="size-3 mt-0.5"/>
                        </Link>
                        <Button size="sm" variant="secondary" className="text-primary/90" onClick={() => setIsOpen(false)}>
                            Done
                        </Button>
                    </div>
                </div>
            </CredenzaContent>
        </Credenza>
    );
};
