import {Link} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {isAtLeastRole, RoleType} from "@/lib/utils/enums";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Copy, Eye, Heart, Layers, MoreVertical, Pen, Trash2} from "lucide-react";
import {communityCollectionsOptions} from "@/lib/client/react-query/query-options";
import {useDeleteCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


interface CollectionCardProps {
    showOwner?: boolean;
    showMediaType?: boolean;
    collection: Awaited<ReturnType<NonNullable<ReturnType<typeof communityCollectionsOptions>["queryFn"]>>>["items"][number];
}


export const CollectionCard = ({ collection, showOwner = true, showMediaType = true }: CollectionCardProps) => {
    const { currentUser } = useAuth();
    const deleteMutation = useDeleteCollectionMutation(collection.id);

    const isOwner = currentUser?.id === collection.ownerId;
    const canManage = isOwner || isAtLeastRole(currentUser?.role as RoleType, RoleType.MANAGER);

    const handleDelete = async () => {
        if (!canManage || deleteMutation.isPending) return;
        if (!window.confirm("This collection will be permanently deleted. Are you sure?")) return;
        await deleteMutation.mutateAsync({ data: { collectionId: collection.id } });
    };

    return (
        <div className="overflow-hidden rounded-lg border bg-popover">
            <Link to="/collections/$collectionId" params={{ collectionId: collection.id }}>
                <div className="group/image relative aspect-16/10 overflow-hidden">
                    {collection.previews.length === 0 &&
                        <div className="flex h-full w-full items-center justify-center bg-secondary">
                            <MainThemeIcon
                                type={collection.mediaType}
                                className="size-10 text-muted-foreground"
                            />
                        </div>
                    }
                    {collection.previews.length === 1 &&
                        <div className="h-full w-full overflow-hidden">
                            <img
                                className="h-full w-full object-cover"
                                alt={collection.previews[0].mediaName}
                                src={collection.previews[0].mediaCover}
                            />
                        </div>
                    }
                    {collection.previews.length === 2 &&
                        <div className="flex h-full w-full gap-0.5">
                            {collection.previews.map((preview, idx) =>
                                <div key={idx} className="relative h-full flex-1 overflow-hidden">
                                    <img
                                        alt={preview.mediaName}
                                        src={preview.mediaCover}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    }
                    {collection.previews.length === 3 &&
                        <div className="flex h-full w-full gap-0.5">
                            <div className="relative h-full flex-1 overflow-hidden">
                                <img
                                    className="h-full w-full object-cover"
                                    alt={collection.previews[0].mediaName}
                                    src={collection.previews[0].mediaCover}
                                />
                            </div>
                            <div className="flex h-full flex-1 flex-col gap-0.5]">
                                {collection.previews.slice(1).map((preview, idx) =>
                                    <div key={idx} className="relative h-full flex-1 overflow-hidden">
                                        <img
                                            alt={preview.mediaName}
                                            src={preview.mediaCover}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    }
                    {collection.previews.length >= 4 &&
                        <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-0.5">
                            <div className="relative col-span-1 row-span-2 overflow-hidden">
                                <img
                                    className="h-full w-full object-cover"
                                    alt={collection.previews[0].mediaName}
                                    src={collection.previews[0].mediaCover}
                                />
                            </div>
                            <div className="relative col-span-1 row-span-1 overflow-hidden">
                                <img
                                    className="h-full w-full object-cover"
                                    alt={collection.previews[1].mediaName}
                                    src={collection.previews[1].mediaCover}
                                />
                            </div>
                            <div className="relative col-span-1 row-span-1 overflow-hidden">
                                <img
                                    className="h-full w-full object-cover"
                                    alt={collection.previews[2].mediaName}
                                    src={collection.previews[2].mediaCover}
                                />
                            </div>
                            <div className="relative col-span-2 row-span-1 overflow-hidden">
                                <img
                                    className="h-full w-full object-cover"
                                    alt={collection.previews[3].mediaName}
                                    src={collection.previews[3].mediaCover}
                                />
                            </div>
                        </div>
                    }
                    <div className="pointer-events-none rounded-t-lg absolute inset-0 z-10 border border-transparent
                    group-hover/image:border-app-accent/80"/>

                    {showMediaType &&
                        <div className="absolute top-2 right-2 capitalize flex gap-1.5 items-center text-xs font-semibold
                        px-2 py-1 text-muted-foreground bg-popover rounded-md">
                            <MainThemeIcon type={collection.mediaType} className="size-3.5"/>
                            {collection.mediaType}
                        </div>
                    }
                </div>
            </Link>
            <div className="flex flex-col gap-2 p-4 pt-3">
                <h3 className="text-sm font-semibold text-foreground truncate" title={collection.title}>
                    {collection.title}
                </h3>
                <div className="flex items-center justify-between">
                    {showOwner &&
                        <Link to="/profile/$username" params={{ username: collection.ownerName }}>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground -ml-1 hover:text-app-accent">
                                <ProfileIcon
                                    fallbackSize="text-xs"
                                    className="border-popover"
                                    user={{ image: collection.ownerImage, name: collection.ownerName }}
                                />
                                {collection.ownerName}
                            </div>
                        </Link>
                    }
                </div>
                <div className="h-px w-full bg-border"/>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-1.5 text-xs" title="Like Count">
                            <Heart className="size-3.5"/>
                            <span className="tabular-nums">{collection.likeCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" title="View Count">
                            <Eye className="size-3.5"/>
                            <span className="tabular-nums">{collection.viewCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" title="Copy Count">
                            <Copy className="size-3.5"/>
                            <span className="tabular-nums">{collection.copiedCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" title="Media Count">
                            <Layers className="size-3.5"/>
                            <span className="tabular-nums">{collection.itemsCount}</span>
                        </div>
                    </div>
                    {canManage &&
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button>
                                    <MoreVertical className="size-4 opacity-60 hover:opacity-100"/>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <Link to="/collections/$collectionId/edit" params={{ collectionId: collection.id }}>
                                    <DropdownMenuItem>
                                        <Pen className="size-4"/> Edit
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem className="focus:bg-red-500/10" onClick={handleDelete}>
                                    <Trash2 className="text-red-500"/>
                                    <span className="text-red-500">Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                </div>
            </div>
        </div>
    );
};
