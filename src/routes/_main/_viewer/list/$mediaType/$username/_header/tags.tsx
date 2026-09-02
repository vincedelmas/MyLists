import React, {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {UserTag} from "@/lib/types/media-list.types";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MediaType, TagAction} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {createFileRoute, Link} from "@tanstack/react-router";
import {SimpleSearch, simpleSearchSchema} from "@/lib/schemas";
import {Layers, MoreVertical, Pen, Tags, Trash2} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {tagsViewOptions} from "@/lib/client/react-query/query-options";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {useEditTagMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/tags")({
    validateSearch: simpleSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, username }, deps: { search } }) => ({
        tagsQueryOptions: tagsViewOptions(mediaType, username, search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.tagsQueryOptions);
    },
    component: TagsView,
});


function TagsView() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const { username, mediaType } = Route.useParams();
    const editMutation = useEditTagMutation(mediaType);
    const { tagsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(tagsQueryOptions).data;
    const { localSearch, setLocalSearch, handleInputChange, updateFilters } = useSearchNavigate<SimpleSearch>({
        search: filters.search ?? "",
        options: { resetScroll: false },
    });

    const isOwner = !!currentUser && currentUser?.name === username;

    const trimLowSearch = localSearch.trim().toLowerCase();
    const searchIsSynced = trimLowSearch === (filters.search ?? "").trim().toLowerCase();
    const showCreateButton = isOwner && trimLowSearch.length > 0 && searchIsSynced && !apiData.exactMatch;

    const clearSearch = () => {
        setLocalSearch("");
        updateFilters({ search: undefined, page: 1 });
    };

    const handleCreateTag = () => {
        const trimmed = localSearch.trim();
        if (!trimmed || editMutation.isPending) return;

        editMutation.mutate({ tag: { name: trimmed }, action: TagAction.ADD }, {
            onSuccess: () => {
                clearSearch();
            },
        });
    };

    const handleDeleteTag = (name: string) => {
        editMutation.mutate({ tag: { name }, action: TagAction.DELETE_ALL });
    }

    const handleRenameTag = (oldName: string, newName: string) => {
        editMutation.mutate({ tag: { name: newName, oldName }, action: TagAction.RENAME })
    }

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        {isOwner ? "Your" : `${username}`} Tags
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        All the tags from {isOwner ? "your" : `${username}`} list
                    </p>
                </div>

                <div className="relative w-72 max-sm:w-full">
                    <Input
                        value={localSearch}
                        onChange={handleInputChange}
                        className="h-10"
                        placeholder="Find or create tag..."
                        onKeyDown={(ev) => {
                            if (ev.key === "Enter" && showCreateButton) handleCreateTag();
                            if (ev.key === "Escape") clearSearch();
                        }}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 flex items-center">
                        {showCreateButton ?
                            <Button
                                size="sm"
                                onClick={handleCreateTag}
                                disabled={editMutation.isPending}
                                className="text-[10px]"
                            >
                                CREATE
                            </Button>
                            :
                            <div className="rounded border px-2 py-1 font-mono text-[10px] tracking-tighter text-muted-foreground">
                                ESC
                            </div>
                        }
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                {apiData.items.length === 0 ?
                    <EmptyState
                        icon={Tags}
                        className="col-span-full rounded-xl border py-20 shadow-xs"
                        message={filters.search ? `No tags found matching "${filters.search}". Create it?` : "No tags created yet."}
                    />
                    :
                    apiData.items.map((col) =>
                        <TagCard
                            tag={col}
                            key={col.tagId}
                            isOwner={isOwner}
                            username={username}
                            mediaType={mediaType}
                            onDelete={handleDeleteTag}
                            onRename={handleRenameTag}
                        />
                    )
                }
            </div>
            <Pagination
                currentPage={apiData.page}
                totalPages={apiData.pages}
                onChangePage={(page) => updateFilters({ page })}
            />
        </>
    );
}


interface TagCardProps {
    tag: UserTag;
    username: string;
    isOwner: boolean;
    mediaType: MediaType;
    onDelete: (name: string) => void;
    onRename: (oldName: string, newName: string) => void;
}


const TagCard = ({ tag, isOwner, mediaType, username, onRename, onDelete }: TagCardProps) => {
    const confirm = useConfirm();
    const [editName, setEditName] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const handleRename = () => {
        if (editName.trim() && editName !== tag.tagName) {
            onRename(tag.tagName, editName);
        }
        setIsEditing(false);
    };

    const handleDelete = async (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Delete Tag",
            title: `Delete "${tag.tagName}"?`,
            description: "This tag will be removed from matching list items.",
        })) return;

        onDelete(tag.tagName);
    };

    return (
        <article className="rounded-xl border p-3 shadow-xs transition-colors hover:border-brand/35">
            <Link
                to="/list/$mediaType/$username"
                params={{ mediaType, username }}
                className={isEditing ? "pointer-events-none" : ""}
                search={{ tags: [tag.tagName] }}
            >
                <div className="aspect-video overflow-hidden rounded-lg">
                    <div className="relative flex h-full items-center justify-center p-6">
                        {tag.medias.map((item, idx, arr) => {
                            const offset = idx - (arr.length - 1) / 2;

                            return (
                                <div
                                    key={item.mediaId}
                                    style={{ zIndex: idx, transform: `translateX(${offset * 70}%)` }}
                                    className="absolute aspect-2/3 w-1/3 overflow-hidden rounded-md border shadow-sm duration-200"
                                >
                                    <img
                                        alt={item.mediaName}
                                        src={item.mediaCover}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Link>

            <div className="pt-1">
                {isEditing ?
                    <Input
                        autoFocus
                        data-bwignore
                        value={editName}
                        onBlur={handleRename}
                        className="h-9 text-sm mt-1"
                        onChange={(ev) => setEditName(ev.target.value)}
                        onKeyDown={(ev) => {
                            if (ev.key === "Enter") handleRename();
                            if (ev.key === "Escape") setIsEditing(false);
                        }}
                    />
                    :
                    <div className="flex items-baseline justify-between pl-1">
                        <div>
                            <h3 className="font-bold">
                                # {tag.tagName}
                            </h3>
                            <span className="flex items-center gap-1 pt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                <Layers className="size-3"/> {tag.totalCount} items
                            </span>
                        </div>
                        {(isOwner && !isEditing) &&
                            <DropdownMenu>
                                <DropdownMenuTrigger className="pt-1" render={<button/>}>
                                    <MoreVertical className="size-4 opacity-60 hover:opacity-100"/>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                        setEditName(tag.tagName);
                                        setIsEditing(true);
                                    }}>
                                        <Pen className="size-4"/> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                                        <Trash2/>
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        }
                    </div>
                }
            </div>
        </article>
    );
};
