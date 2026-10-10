import {Link} from "@tanstack/react-router";
import type {CommunitySearch} from "@/lib/schemas";
import {formatNumber} from "@/lib/utils/formatting/number";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ActionsMenu} from "@/lib/client/components/general/ActionsMenu";
import {ListCoverStrip} from "@/lib/client/components/lists/ListCoverStrip";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import type {CollectionSummaryData} from "@/lib/client/react-query/query-options";
import {OverflowBadges} from "@/lib/client/components/general/OverflowBadges";
import {CollectionActions} from "@/lib/client/components/collections/CollectionActions";
import {Copy, Eye, Heart, List, ListOrdered, Pin} from "lucide-react";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface CollectionCardProps {
    showOwner?: boolean;
    collection: CollectionSummaryData;
    communitySearch?: CommunitySearch;
}


export const CollectionCard = ({ collection, communitySearch, showOwner = true }: CollectionCardProps) => {
    const canManage = collection.capabilities.edit || collection.capabilities.delete;
    const manageCollectionActions = canManage &&
        <ActionsMenu label={`Actions for ${collection.title}`}>
            <CollectionActions collection={collection} capabilities={collection.capabilities} fromCommunity={communitySearch}/>
        </ActionsMenu>;

    return (
        <Card className="relative min-w-0 gap-0 py-0 transition-shadow hover:ring-brand hover:shadow-sm sm:flex-row" role="article" aria-label={collection.title}>
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
                    <CardTitle className="flex min-w-0 items-center gap-2">
                        {collection.profilePosition !== null && <Pin className="size-3.5 shrink-0 fill-brand/20 text-brand" aria-label="Pinned to profile"/>}
                        <span className="truncate">{collection.title}</span>
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
                    <OverflowBadges
                        label="Collection details"
                        itemLabel="collection detail"
                        overflowTitle="More collection details"
                        badges={[
                            ...collection.mediaTypes.map(mediaType => ({
                                key: mediaType,
                                content: <><MainThemeIcon type={mediaType}/><span className="capitalize">{mediaType}</span></>,
                            })),
                            {
                                key: "order",
                                content: <>{collection.ordered ? <ListOrdered/> : <List/>}<span>{collection.ordered ? "Ranked" : "Unranked"}</span></>,
                            },
                            {
                                key: "privacy",
                                content: <><PrivacyIcon type={collection.privacy}/><span>{collection.privacy}</span></>,
                            },
                        ]}
                    />
                    <p className="h-4 truncate text-xs text-muted-foreground" title={collection.description ?? undefined}>
                        {collection.description}
                    </p>
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
};
