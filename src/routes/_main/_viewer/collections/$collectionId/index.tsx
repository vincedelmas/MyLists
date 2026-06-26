import {collectionIdSchema} from "@/lib/schemas";
import {Copy, Heart, Pencil} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatDate} from "@/lib/utils/date-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {MediaCornerCommon} from "@/lib/client/components/media/base/MediaCornerCommon";
import {collectionDetailsReadOptions} from "@/lib/client/react-query/query-options";
import {useCopyCollectionMutation, useToggleCollectionLikeMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_viewer/collections/$collectionId/")({
    params: {
        parse: (params) => {
            const result = collectionIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        }
    },
    loader: ({ context: { queryClient }, params: { collectionId } }) => {
        return queryClient.ensureQueryData(collectionDetailsReadOptions(collectionId));
    },
    component: CollectionViewer,
});


function CollectionViewer() {
    const { isAnonymous } = useAuth();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const copyMutation = useCopyCollectionMutation(collectionId);
    const toggleLikeMutation = useToggleCollectionLikeMutation(collectionId);
    const apiData = useSuspenseQuery(collectionDetailsReadOptions(collectionId)).data;

    const { collection, items, isLiked, canManage } = apiData;

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
                <div className="flex items-center gap-3">
                    {!isAnonymous &&
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleLikeCollection}
                                disabled={toggleLikeMutation.isPending}
                            >
                                <Heart className={isLiked ? "text-red-500" : ""}/>
                                {collection.likeCount}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCopyCollection} disabled={copyMutation.isPending}>
                                <Copy className="size-4"/> Copy
                            </Button>
                        </>
                    }
                    <Badge variant="outline">
                        {collection.ordered ? "Ranked" : "Unranked"}
                    </Badge>
                    <PrivacyIcon type={collection.privacy} className="size-4"/>
                </div>
                <div>
                    {canManage &&
                        <Button size="sm" variant="outline" onClick={handleEditCollection}>
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
                <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {items.map((item) =>
                        <MediaCard key={item.mediaId} item={item} mediaType={collection.mediaType}>
                            {collection.ordered &&
                                <div className="absolute top-2 left-2 self-start rounded-md bg-black/70 px-3 py-0.5 text-sm font-semibold">
                                    #{item.orderIndex}
                                </div>
                            }
                            {!isAnonymous && item.inUserList &&
                                <MediaCornerCommon
                                    isCommon={item.inUserList}
                                />
                            }
                            <div className="absolute bottom-0 w-full space-y-1 rounded-b-sm p-3">
                                <div className="flex w-full items-center justify-between space-x-2 text-sm">
                                    <h3 className="grow truncate font-semibold text-primary" title={item.mediaName}>
                                        {item.mediaName}
                                    </h3>
                                </div>
                                <div className="flex w-full flex-wrap items-center justify-between">
                                    <div className="shrink-0 text-xs font-medium text-muted-foreground">
                                        {formatDate(item.releaseDate)}
                                    </div>
                                    {item.annotation &&
                                        <DisplayComment
                                            content={item.annotation}
                                        />
                                    }
                                </div>
                            </div>
                        </MediaCard>
                    )}
                </div>
            }
        </PageTitle>
    );
}
