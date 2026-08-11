import {collectionIdSchema, collectionItemsSearchSchema} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {Copy, Heart, List, ListOrdered, Pencil} from "lucide-react";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {collectionDetailsReadOptions} from "@/lib/client/react-query/query-options";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
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
import {useCopyCollectionMutation, useToggleCollectionLikeMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";


export const Route = createFileRoute("/_main/_viewer/collections/$collectionId/")({
    validateSearch: collectionItemsSearchSchema,
    loaderDeps: ({ search: { page } }) => ({ page: page ?? 1 }),
    params: {
        parse: (params) => {
            const result = collectionIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        }
    },
    loader: ({ context: { queryClient }, params: { collectionId }, deps: { page } }) => {
        return queryClient.ensureQueryData(collectionDetailsReadOptions(collectionId, page));
    },
    component: CollectionViewer,
});


function CollectionViewer() {
    const navigate = Route.useNavigate();
    const { page = 1 } = Route.useSearch();
    const { collectionId } = Route.useParams();
    const { currentUser, isAnonymous } = useAuth();
    const copyMutation = useCopyCollectionMutation(collectionId);
    const toggleLikeMutation = useToggleCollectionLikeMutation(collectionId);
    const apiData = useSuspenseQuery(collectionDetailsReadOptions(collectionId, page)).data;

    const { collection, items, isLiked, capabilities } = apiData;
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

    return (
        <PageTitle
            title={`Collection - ${collection.title}`}
            subtitle={`${collection.ownerName} • ${capitalize(collection.mediaType)} • ${collection.itemsCount} media`}
        >
            <div className="flex flex-wrap items-center justify-between pb-5">
                <div className="flex items-center gap-2">
                    {capabilities.like &&
                        <>
                            <Button
                                variant="outline"
                                onClick={handleLikeCollection}
                                disabled={toggleLikeMutation.isPending}
                            >
                                <Heart className={isLiked ? "text-favorite" : ""}/>
                                {collection.likeCount}
                            </Button>
                        </>
                    }
                    {capabilities.copy &&
                        <Button variant="outline" onClick={handleCopyCollection} disabled={copyMutation.isPending}>
                            <Copy className="size-4"/> Copy
                        </Button>
                    }
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
                </div>
                <div>
                    {capabilities.edit &&
                        <Button variant="outline" onClick={handleEditCollection}>
                            <Pencil/> Edit Collection
                        </Button>
                    }
                </div>
            </div>

            {collection.description &&
                <div className="border rounded-lg w-full px-4 py-3">
                    {collection.description}
                </div>
            }

            {items.length === 0 ?
                <EmptyState
                    icon={Heart}
                    message="This collection does not have any media yet."
                />
                :
                <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {items.map((item) =>
                        <MediaCard key={item.mediaId} item={item} mediaType={collection.mediaType}>
                            <MediaCardLeftCorner>
                                # {item.orderIndex}
                            </MediaCardLeftCorner>

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
                onChangePage={(nextPage) => {
                    void navigate({ search: (previous) => ({ ...previous, page: nextPage }) });
                }}
            />
        </PageTitle>
    );
}
