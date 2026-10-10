import {Link} from "@tanstack/react-router";
import type {CommunitySearch} from "@/lib/schemas";
import {toItemKey} from "@/lib/utils/media/item-key";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ActionsMenu} from "@/lib/client/components/general/ActionsMenu";
import {ListCoverStrip} from "@/lib/client/components/lists/ListCoverStrip";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import type {CollectionSummaryData} from "@/lib/client/react-query/query-options";
import {CollectionMediaTypes} from "@/lib/client/components/collections/CollectionMediaTypes";
import {CollectionActions} from "@/lib/client/components/collections/CollectionActions";
import {Copy, Eye, Heart, Layers, List, ListOrdered} from "lucide-react";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface CollectionCardProps {
    showOwner?: boolean;
    variant?: "card" | "showcase";
    collection: CollectionSummaryData;
    communitySearch?: CommunitySearch;
}


export const CollectionCard = ({ collection, communitySearch, showOwner = true, variant = "card" }: CollectionCardProps) => {
    const canManage = collection.capabilities.edit || collection.capabilities.delete;
    const manageCollectionActions = canManage &&
        <ActionsMenu label={`Actions for ${collection.title}`}>
            <CollectionActions collection={collection} capabilities={collection.capabilities} fromCommunity={communitySearch}/>
        </ActionsMenu>;

    if (variant === "showcase") {
        return (
            <Card className="relative min-w-0 gap-0 py-0 transition-shadow hover:shadow-sm sm:flex-row" role="article" aria-label={collection.title}>
                <Link
                    to="/lists/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    search={{ fromCommunity: communitySearch }}
                    aria-label={`Open ${collection.title}`}
                    className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                />
                <ListCoverStrip
                    variant="showcase"
                    covers={collection.previews.map(preview => ({
                        title: preview.mediaName,
                        mediaId: preview.mediaId,
                        mediaType: preview.mediaType,
                        imageCover: preview.mediaCover,
                    }))}
                    className="pointer-events-none h-28 w-full sm:h-auto sm:w-44 sm:self-stretch xl:w-52"
                />
                <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-3 py-4 sm:py-5">
                    <CardHeader className="min-w-0 gap-y-2" title={collection.title}>
                        <CardTitle className="min-w-0 truncate">
                            {collection.title}
                        </CardTitle>
                        <CardDescription>
                            {formatNumber(collection.itemsCount)} media
                        </CardDescription>
                        {canManage &&
                            <CardAction className="pointer-events-auto relative">
                                {manageCollectionActions}
                            </CardAction>
                        }
                    </CardHeader>
                    <CardContent className="flex min-w-0 flex-col gap-3">
                        <div className="flex flex-wrap gap-1.5">
                            <CollectionMediaTypes mediaTypes={collection.mediaTypes}/>
                            <Badge variant="outline">
                                {collection.ordered
                                    ? <><ListOrdered/> Ranked</>
                                    : <><List/> Unranked</>
                                }
                            </Badge>
                            <Badge variant="outline">
                                <PrivacyIcon type={collection.privacy}/>
                                {collection.privacy}
                            </Badge>
                        </div>
                        {collection.description &&
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                {collection.description}
                            </p>
                        }
                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                            {showOwner &&
                                <Link
                                    to="/profile/$username"
                                    params={{ username: collection.ownerName }}
                                    className="pointer-events-auto relative flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand"
                                >
                                    <ProfileIcon
                                        fallbackSize="text-xs"
                                        className="border-popover"
                                        user={{ image: collection.ownerImage, name: collection.ownerName }}
                                    />
                                    <span className="truncate">{collection.ownerName}</span>
                                </Link>
                            }
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5" title="Likes">
                                    <Heart className="size-3.5 text-brand" aria-hidden="true"/>
                                    <span className="tabular-nums">{formatNumber(collection.likeCount)}</span>
                                    <span className="sr-only"> likes</span>
                                </span>
                                <span className="flex items-center gap-1.5" title="Views">
                                    <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                                    <span className="tabular-nums">{formatNumber(collection.viewCount)}</span>
                                    <span className="sr-only"> views</span>
                                </span>
                                <span className="flex items-center gap-1.5" title="Copies">
                                    <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                                    <span className="tabular-nums">{formatNumber(collection.copiedCount)}</span>
                                    <span className="sr-only"> copies</span>
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        );
    }

    return (
        <article className="min-w-0">
            <Link
                to="/lists/collections/$collectionId"
                aria-label={`Open ${collection.title}`}
                params={{ collectionId: collection.id }}
                search={{ fromCommunity: communitySearch }}
                className="group/image block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <div className="relative aspect-16/10 overflow-hidden rounded-lg bg-secondary ring-1 ring-foreground/10 transition-all
                duration-300 group-hover/image:ring-brand/70">
                    {collection.previews.length === 0 &&
                        <div className="flex size-full items-center justify-center bg-secondary">
                            <Layers className="size-10 text-muted-foreground"/>
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
                                <div key={toItemKey(preview)} className="relative h-full flex-1 overflow-hidden">
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
                                    <div key={toItemKey(preview)} className="relative min-h-0 flex-1 overflow-hidden">
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
                                <div key={toItemKey(preview)} className="relative overflow-hidden">
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
                </div>
            </Link>

            <div className="px-1 pt-3">
                {collection.mediaTypes.length > 0 &&
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        <CollectionMediaTypes
                            mediaTypes={collection.mediaTypes}
                        />
                    </div>
                }

                <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                        <Link
                            title={collection.title}
                            to="/lists/collections/$collectionId"
                            params={{ collectionId: collection.id }}
                            search={{ fromCommunity: communitySearch }}
                            className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-brand"
                        >
                            {collection.title}
                        </Link>

                        {showOwner &&
                            <Link
                                to="/profile/$username"
                                params={{ username: collection.ownerName }}
                                className="mt-1.5 flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground
                                transition-colors hover:text-brand"
                            >
                                <ProfileIcon
                                    fallbackSize="text-xs"
                                    className="border-background"
                                    user={{ image: collection.ownerImage, name: collection.ownerName }}
                                />
                                <span className="truncate">
                                    {collection.ownerName}
                                </span>
                            </Link>
                        }
                    </div>

                    {manageCollectionActions}
                </div>

                <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5" title="Likes">
                        <Heart className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">
                            {formatNumber(collection.likeCount)}
                        </span>
                    </span>

                    <span className="flex items-center gap-1.5" title="Views">
                        <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">
                            {formatNumber(collection.viewCount)}
                        </span>
                    </span>

                    <span className="flex items-center gap-1.5" title="Copies">
                        <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">
                            {formatNumber(collection.copiedCount)}
                        </span>
                    </span>

                    <span className="ml-auto flex items-center gap-1.5" title="Titles">
                        <Layers className="size-3.5 text-brand" aria-hidden="true"/>
                        <span className="tabular-nums">
                            {formatNumber(collection.itemsCount)}
                        </span>
                    </span>
                </div>
            </div>
        </article>
    );
};
