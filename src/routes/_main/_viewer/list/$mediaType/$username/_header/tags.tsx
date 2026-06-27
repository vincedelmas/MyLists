import React, {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {UserTag} from "@/lib/types/media-list.types";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MediaType, TagAction} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Layers, MoreVertical, Pen, Tags, Trash2} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {tagsViewOptions} from "@/lib/client/react-query/query-options";
import {useEditTagMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/tags")({
    loader: async ({ context: { queryClient }, params: { mediaType, username } }) => {
        return queryClient.ensureQueryData(tagsViewOptions(mediaType, username));
    },
    component: TagsView,
});


function TagsView() {
    const { currentUser } = useAuth();
    const { username, mediaType } = Route.useParams();
    const editMutation = useEditTagMutation(mediaType);
    const [searchQuery, setSearchQuery] = useState("");
    const isOwner = !!currentUser && currentUser?.name === username;
    const { data: tags } = useSuspenseQuery(tagsViewOptions(mediaType, username),);

    const search = searchQuery.toLowerCase();
    const filteredTags = tags.filter((c) => c.tagName.toLowerCase().includes(search));

    const showCreateButton = isOwner && searchQuery.trim().length > 0
        && !tags.some((c) => c.tagName.toLowerCase() === searchQuery.trim().toLowerCase(),);

    const handleCreate = () => {
        const trimmed = searchQuery.trim();
        if (!trimmed || editMutation.isPending) return;

        editMutation.mutate({ tag: { name: trimmed }, action: TagAction.ADD }, {
            onSuccess: () => setSearchQuery(""),
        });
    };

    return (
        <>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                            value={searchQuery}
                            className="h-10 bg-popover/50"
                            placeholder="Find or create tag..."
                            onChange={(ev) => setSearchQuery(ev.target.value)}
                            onKeyDown={(ev) => {
                                if (ev.key === "Enter" && showCreateButton) handleCreate();
                                if (ev.key === "Escape") setSearchQuery("");
                            }}
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 flex items-center">
                            {showCreateButton ?
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    disabled={editMutation.isPending}
                                    className="h-7 bg-app-accent/80 hover:bg-app-accent text-[10px] font-bold px-2.5
                                    rounded shadow-sm transition-all text-primary/90"
                                >
                                    {editMutation.isPending ? "..." : "CREATE"}
                                </Button>
                                :
                                <div className="px-2 py-1 rounded bg-popover/50 border text-[10px] text-muted-foreground
                                font-mono tracking-tighter">
                                    ESC
                                </div>
                            }
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                    {filteredTags.length === 0 ?
                        <EmptyState
                            icon={Tags}
                            className="col-span-full py-20"
                            message={searchQuery
                                ? `No tags found matching "${searchQuery}". Create it?`
                                : "No tags created yet."
                            }
                        />
                        :
                        filteredTags.map((col) =>
                            <TagCard
                                tag={col}
                                key={col.tagId}
                                isOwner={isOwner}
                                username={username}
                                mediaType={mediaType}
                                onDelete={(name) => editMutation.mutate({ tag: { name }, action: TagAction.DELETE_ALL })}
                                onRename={(oldName, newName) => {
                                    editMutation.mutate({ tag: { name: newName, oldName }, action: TagAction.RENAME })
                                }}
                            />
                        )
                    }
                </div>
            </div>
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
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(tag.tagName);

    const handleRename = () => {
        if (editName.trim() && editName !== tag.tagName) {
            onRename(tag.tagName, editName);
        }
        setIsEditing(false);
    };

    const handleDelete = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (window.confirm(`Delete "${tag.tagName}"?`)) {
            onDelete(tag.tagName);
        }
    };

    return (
        <div>
            <Link
                to="/list/$mediaType/$username"
                params={{ mediaType, username }}
                className={isEditing ? "pointer-events-none" : ""}
                search={{ tags: [tag.tagName] }}
            >
                <div className="aspect-video rounded-lg border overflow-hidden duration-200 hover:border-app-accent/50">
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
                                <DropdownMenuTrigger className="pt-1" asChild>
                                    <button>
                                        <MoreVertical className="size-4 opacity-60 hover:opacity-100"/>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Pen className="size-4"/> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="focus:bg-red-500/10" onClick={handleDelete}>
                                        <Trash2 className="text-red-500"/>
                                        <span className="text-red-500">Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        }
                    </div>
                }
            </div>
        </div>
    );
};
