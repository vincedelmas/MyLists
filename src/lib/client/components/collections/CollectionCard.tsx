import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/number-formatting";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {ArrowRight, Copy, Eye, Heart, Layers, List, ListOrdered, MoreVertical, Pen, Trash2} from "lucide-react";
import {communityCollectionsOptions} from "@/lib/client/react-query/query-options";
import {useDeleteCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/lib/client/components/ui/dropdown-menu";


interface CollectionCardProps {
    showOwner?: boolean;
    showMediaType?: boolean;
    variant?: "card" | "showcase";
    collection: Awaited<ReturnType<NonNullable<ReturnType<typeof communityCollectionsOptions>["queryFn"]>>>["items"][number];
}


export const CollectionCard = ({ collection, showOwner = true, showMediaType = true, variant = "card" }: CollectionCardProps) => {
    const confirm = useConfirm();
    const deleteMutation = useDeleteCollectionMutation(collection.id);
    const canManage = collection.capabilities.edit || collection.capabilities.delete;

    const handleDelete = async () => {
        if (!collection.capabilities.delete || deleteMutation.isPending) return;

        if (!await confirm({
            variant: "destructive",
            title: "Delete this collection?",
            confirmLabel: "Delete collection",
            description: "This collection will be permanently deleted.",
        })) return;

        await deleteMutation.mutateAsync({ data: { collectionId: collection.id } });
    };

    const manageCollectionMenu = canManage &&
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Manage collection"/>}>
                <MoreVertical/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    {collection.capabilities.edit &&
                        <DropdownMenuItem
                            render={<Link to="/collections/$collectionId/edit" params={{ collectionId: collection.id }}/>}>
                            <Pen/> Edit
                        </DropdownMenuItem>
                    }
                    {collection.capabilities.delete &&
                        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                            <Trash2/>
                            <span>Delete</span>
                        </DropdownMenuItem>
                    }
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>;

    if (variant === "showcase") {
        const visiblePreviews = collection.previews.slice(0, 4);

        return (
            <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border shadow-xs transition-colors
            hover:border-foreground/20 focus-within:border-brand/50">
                <Link
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    aria-label={`Open ${collection.title}`}
                    className="block outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
                >
                    <div className="relative h-40 overflow-hidden bg-muted/20">
                        {visiblePreviews.length === 0
                            ?
                            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                <MainThemeIcon type={collection.mediaType} className="size-9"/>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                                    Empty collection
                                </span>
                            </div>
                            :
                            <div
                                className="grid size-full gap-px bg-border"
                                style={{ gridTemplateColumns: `repeat(${visiblePreviews.length}, minmax(0, 1fr))` }}
                            >
                                {visiblePreviews.map((preview) =>
                                    <div key={preview.mediaId} className="overflow-hidden bg-secondary">
                                        <img
                                            loading="lazy"
                                            className="size-full object-cover"
                                            alt={preview.mediaName}
                                            src={preview.mediaCover}
                                        />
                                    </div>
                                )}
                            </div>
                        }
                    </div>
                </Link>

                <div className="flex flex-1 flex-col px-4 pb-3 pt-3 max-sm:px-3">
                    <div className="flex min-w-0 items-center gap-2">
                        {showMediaType &&
                            <>
                                <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <MainThemeIcon className="size-3 text-brand" type={collection.mediaType}/>
                                    <span className="truncate capitalize">{collection.mediaType}</span>
                                </div>
                                <span className="text-xs text-muted-foreground" aria-hidden="true">·</span>
                            </>
                        }
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {formatNumber(collection.itemsCount)} titles
                        </span>
                        <Badge variant="outline" className="ml-auto">
                            {collection.ordered
                                ? <><ListOrdered className="size-3"/> Ranked</>
                                : <><List className="size-3"/> Unranked</>
                            }
                        </Badge>
                    </div>

                    <div className="mt-2 flex min-w-0 items-center gap-2">
                        <Link
                            to="/collections/$collectionId"
                            params={{ collectionId: collection.id }}
                            className="block min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground transition-colors hover:text-brand"
                            title={collection.title}
                        >
                            {collection.title}
                        </Link>
                        {!showOwner && manageCollectionMenu}
                    </div>

                    {showOwner &&
                        <div className="mt-2 flex min-h-7 items-center gap-2">
                            <Link
                                to="/profile/$username"
                                params={{ username: collection.ownerName }}
                                className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand"
                            >
                                <ProfileIcon
                                    fallbackSize="text-xs"
                                    className="border-popover"
                                    user={{ image: collection.ownerImage, name: collection.ownerName }}
                                />
                                <span className="truncate">{collection.ownerName}</span>
                            </Link>
                            <div className="ml-auto shrink-0">
                                {manageCollectionMenu}
                            </div>
                        </div>
                    }

                    <div className="mt-2 flex items-center gap-3 border-t pt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Heart className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">{formatNumber(collection.likeCount)}</span>
                            <span className="sr-only"> likes</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">{formatNumber(collection.viewCount)}</span>
                            <span className="sr-only"> views</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">{formatNumber(collection.copiedCount)}</span>
                            <span className="sr-only"> copies</span>
                        </span>
                        <Link
                            to="/collections/$collectionId"
                            params={{ collectionId: collection.id }}
                            className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto -mr-1" })}
                        >
                            Open
                            <ArrowRight data-icon="inline-end"/>
                        </Link>
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article className="min-w-0">
            <Link
                to="/collections/$collectionId"
                params={{ collectionId: collection.id }}
                aria-label={`Open ${collection.title}`}
                className="group/image block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <div className="relative aspect-16/10 overflow-hidden rounded-lg bg-secondary ring-1 ring-foreground/10 transition-all
                duration-300 group-hover/image:ring-brand/70">
                    {collection.previews.length === 0 &&
                        <div className="flex size-full items-center justify-center bg-secondary">
                            <MainThemeIcon type={collection.mediaType} className="size-10 text-muted-foreground"/>
                        </div>
                    }
                    {collection.previews.length === 1 &&
                        <div className="size-full overflow-hidden">
                            <img
                                loading="lazy"
                                className="size-full object-cover"
                                alt={collection.previews[0].mediaName}
                                src={collection.previews[0].mediaCover}
                            />
                        </div>
                    }
                    {collection.previews.length === 2 &&
                        <div className="flex size-full gap-0.5">
                            {collection.previews.map((preview) =>
                                <div key={preview.mediaId} className="relative h-full flex-1 overflow-hidden">
                                    <img
                                        loading="lazy"
                                        alt={preview.mediaName}
                                        src={preview.mediaCover}
                                        className="size-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    }
                    {collection.previews.length === 3 &&
                        <div className="flex size-full gap-0.5">
                            <div className="relative h-full flex-1 overflow-hidden">
                                <img
                                    loading="lazy"
                                    className="size-full object-cover"
                                    alt={collection.previews[0].mediaName}
                                    src={collection.previews[0].mediaCover}
                                />
                            </div>
                            <div className="flex h-full flex-1 flex-col gap-0.5">
                                {collection.previews.slice(1).map((preview) =>
                                    <div key={preview.mediaId} className="relative min-h-0 flex-1 overflow-hidden">
                                        <img
                                            loading="lazy"
                                            alt={preview.mediaName}
                                            src={preview.mediaCover}
                                            className="size-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    }
                    {collection.previews.length >= 4 &&
                        <div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
                            {collection.previews.slice(0, 4).map((preview) =>
                                <div key={preview.mediaId} className="relative overflow-hidden">
                                    <img
                                        loading="lazy"
                                        className="size-full object-cover"
                                        alt={preview.mediaName}
                                        src={preview.mediaCover}
                                    />
                                </div>
                            )}
                        </div>
                    }

                    {showMediaType &&
                        <Badge variant="overlay" className="absolute right-2.5 top-2.5 capitalize">
                            <MainThemeIcon data-icon="inline-start" type={collection.mediaType}/>
                            {collection.mediaType}
                        </Badge>
                    }
                </div>
            </Link>

            <div className="px-1 pt-3">
                <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                        <Link
                            to="/collections/$collectionId"
                            params={{ collectionId: collection.id }}
                            className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-brand"
                            title={collection.title}
                        >
                            {collection.title}
                        </Link>
                        {showOwner &&
                            <Link
                                to="/profile/$username"
                                params={{ username: collection.ownerName }}
                                className="mt-1.5 flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand"
                            >
                                <ProfileIcon
                                    fallbackSize="text-xs"
                                    className="border-background"
                                    user={{ image: collection.ownerImage, name: collection.ownerName }}
                                />
                                <span className="truncate">{collection.ownerName}</span>
                            </Link>
                        }
                    </div>

                    {manageCollectionMenu}
                </div>

                <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5" title="Likes">
                        <Heart className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">{formatNumber(collection.likeCount)}</span>
                    </span>
                    <span className="flex items-center gap-1.5" title="Views">
                        <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">{formatNumber(collection.viewCount)}</span>
                    </span>
                    <span className="flex items-center gap-1.5" title="Copies">
                        <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">{formatNumber(collection.copiedCount)}</span>
                    </span>
                    <span className="ml-auto flex items-center gap-1.5" title="Titles">
                        <Layers className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">{formatNumber(collection.itemsCount)}</span>
                    </span>
                </div>
            </div>
        </article>
    );
};
