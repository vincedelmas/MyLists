import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {THEME_ICONS_MAP} from "@/lib/utils/theme-utils";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/number-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {collectionIdSchema, collectionItemsSearchSchema} from "@/lib/schemas";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {Copy, Eye, Heart, Layers3, List, ListOrdered, Pencil} from "lucide-react";
import {collectionDetailsReadOptions} from "@/lib/client/react-query/query-options";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
import {useCopyCollectionMutation, useToggleCollectionLikeMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {
    MediaCard,
    MediaCardDetails,
    MediaCardFooter,
    MediaCardLeftCorner,
    MediaCardMeta,
    MediaCardRightCorner,
    MediaCardSignals,
    MediaCardTitle
} from "@/lib/client/components/media/base/MediaCard";


export const Route = createFileRoute("/_main/_viewer/collections/$collectionId/")({
    validateSearch: collectionItemsSearchSchema,
    loaderDeps: ({ search: { page } }) => ({ page: page ?? 1 }),
    params: {
        parse: (params) => {
            const result = collectionIdSchema.safeParse(params);
            return result.success ? result.data : false;
        }
    },
    context: ({ params: { collectionId }, deps: { page } }) => ({
        collectionDetailsQueryOptions: collectionDetailsReadOptions(collectionId, page),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.collectionDetailsQueryOptions);
    },
    component: CollectionViewer,
});


function CollectionViewer() {
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const { currentUser, isAnonymous } = useAuth();
    const copyMutation = useCopyCollectionMutation(collectionId);
    const { collectionDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionDetailsQueryOptions).data;
    const toggleLikeMutation = useToggleCollectionLikeMutation(collectionId);

    const { collection, items, isLiked, capabilities } = apiData;
    const CollectionTypeIcon = collection.ordered ? ListOrdered : List;
    const hasActions = capabilities.like || capabilities.copy || capabilities.edit;

    const MediaIcon = THEME_ICONS_MAP[collection.mediaType];
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, collection.mediaType);

    const handleLikeCollection = () => {
        toggleLikeMutation.mutate({ data: { collectionId } });
    };

    const handleCopyCollection = async () => {
        const result = await copyMutation.mutateAsync({ data: { collectionId } });
        await navigate({ to: "/collections/$collectionId/edit", params: { collectionId: result.id } });
    };

    const handleEditCollection = async () => {
        await navigate({ to: "/collections/$collectionId/edit", params: { collectionId: collectionId } });
    };

    const onChangePage = (nextPage: number) => {
        void navigate({ search: prev => ({ ...prev, page: nextPage }) });
    };

    return (
        <PageTitle title={collection.title} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={Layers3}
                    eyebrowIcon={MediaIcon}
                    title={collection.title}
                    eyebrow={`${capitalize(collection.mediaType)} collection`}
                    asideLabel="In this collection"
                    asideValue={<>{formatNumber(collection.itemsCount)} {collection.itemsCount === 1 ? "title" : "titles"}</>}
                    description={
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                            Made by
                            <Link
                                to="/profile/$username"
                                params={{ username: collection.ownerName }}
                                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-brand"
                            >
                                {collection.ownerName}
                            </Link>
                        </span>
                    }
                />

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 max-sm:flex-col max-sm:items-stretch">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Badge variant="outline">
                            {collection.ordered
                                ? <><ListOrdered className="size-3"/> Ranked</>
                                : <><List className="size-3"/> Unranked</>
                            }
                        </Badge>
                        <Badge variant="outline">
                            <PrivacyIcon
                                className="size-4"
                                type={collection.privacy}
                            />
                            {collection.privacy}
                        </Badge>

                        <span className="h-4 border-l max-sm:hidden" aria-hidden="true"/>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Likes">
                            <Heart className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">{formatNumber(collection.likeCount)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Views">
                            <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">{formatNumber(collection.viewCount)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Copies">
                            <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">{formatNumber(collection.copiedCount)}</span>
                        </span>
                    </div>

                    {hasActions &&
                        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>button]:flex-1">
                            {capabilities.like &&
                                <Button variant="outline" onClick={handleLikeCollection} disabled={toggleLikeMutation.isPending}>
                                    <Heart className={isLiked ? "fill-favorite text-favorite" : ""}/>
                                    {isLiked ? "Liked" : "Like"}
                                </Button>
                            }
                            {capabilities.copy &&
                                <Button variant="outline" onClick={handleCopyCollection} disabled={copyMutation.isPending}>
                                    <Copy/> Copy
                                </Button>
                            }
                            {capabilities.edit &&
                                <Button variant="outline" onClick={handleEditCollection}>
                                    <Pencil/> Edit
                                </Button>
                            }
                        </div>
                    }
                </div>

                {collection.description &&
                    <p className="max-w-3xl whitespace-pre-line pt-5 text-sm leading-relaxed text-muted-foreground">
                        {collection.description}
                    </p>
                }

                <div className="flex items-center justify-between gap-4 pb-4 pt-5">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {collection.ordered ? "Ranked titles" : "Collection titles"}
                    </h2>
                    {apiData.pages > 1 &&
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            Page {apiData.page} / {apiData.pages}
                        </span>
                    }
                </div>

                {items.length === 0 ?
                    <EmptyState
                        className="rounded-xl border py-20 shadow-xs"
                        icon={CollectionTypeIcon}
                        message="This collection does not have any media yet."
                    />
                    :
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {items.map((item) =>
                            <MediaCard key={item.mediaId} item={item} mediaType={collection.mediaType}>
                                {collection.ordered &&
                                    <MediaCardLeftCorner>
                                        #{item.orderIndex}
                                    </MediaCardLeftCorner>
                                }

                                {(!isAnonymous && isMediaTypeActive && item.inUserList) &&
                                    <MediaCardRightCorner>
                                        <DisplayInUserListCheck/>
                                    </MediaCardRightCorner>
                                }

                                <MediaCardFooter>
                                    <MediaCardTitle title={item.mediaName}>
                                        {item.mediaName}
                                    </MediaCardTitle>
                                    <MediaCardMeta>
                                        <MediaCardDetails>
                                            <MediaReleaseDate date={item.releaseDate}/>
                                        </MediaCardDetails>
                                        {item.annotation &&
                                            <MediaCardSignals>
                                                <DisplayComment content={item.annotation}/>
                                            </MediaCardSignals>
                                        }
                                    </MediaCardMeta>
                                </MediaCardFooter>
                            </MediaCard>
                        )}
                    </div>
                }
                <Pagination
                    currentPage={apiData.page}
                    totalPages={apiData.pages}
                    onChangePage={onChangePage}
                />
            </div>
        </PageTitle>
    );
}
