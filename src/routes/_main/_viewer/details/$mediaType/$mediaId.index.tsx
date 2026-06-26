import {Suspense} from "react";
import {ExternalLink, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Card} from "@/lib/client/components/ui/card";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {MediaHero} from "@/lib/client/components/media/base/MediaHero";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {SimilarMedia} from "@/lib/client/components/media/base/SimilarMedia";
import {MediaSynopsis} from "@/lib/client/components/media/base/MediaSynopsis";
import {MediaComponent} from "@/lib/client/components/media/base/MediaComponent";
import {RefreshAndEdit} from "@/lib/client/components/media/base/RefreshAndEdit";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {CollectionsLists} from "@/lib/client/components/media/base/CollectionsLists";
import {MediaFollowsSection} from "@/lib/client/components/media/base/MediaFollowsSection";
import {MediaCommunityActivity} from "@/lib/client/components/media/base/MediaCommunityActivity";
import {MediaCommunityCollections} from "@/lib/client/components/media/base/MediaCommunityCollections";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {mediaCommunityActivityOptions, mediaCommunityCollectionsOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    loader: async ({ context: { queryClient }, params: { mediaType, mediaId } }) => {
        const details = await queryClient.ensureQueryData(mediaDetailsOptions(mediaType, mediaId));
        void queryClient.prefetchQuery(mediaCommunityCollectionsOptions(details.media.id, mediaType));
        void queryClient.prefetchQuery(mediaCommunityActivityOptions(details.media.id, mediaType, { page: 1, perPage: 8 }));
    },
    component: MediaDetailsPage,
});


function MediaDetailsPage() {
    const { isAnonymous } = useAuth();
    const { mediaType, mediaId } = Route.useParams();
    const addMediaToListMutation = useAddMediaToListMutation(mediaDetailsOptions(mediaType, mediaId));
    const { media, userMedia, followsData, similarMedia } = useSuspenseQuery(mediaDetailsOptions(mediaType, mediaId)).data;

    const handleAddMediaToUser = () => {
        addMediaToListMutation.mutate({ data: { mediaType, mediaId: media.id } });
    };

    return (
        <PageTitle title={media.name} onlyHelmet>
            <MediaHero
                media={media}
                mediaType={mediaType}
            />
            <div className="grid grid-cols-12 gap-8 mx-auto px-4 py-2 max-sm:py-0 max-lg:grid-cols-1">
                <div className="col-span-8 space-y-8 max-lg:col-span-1 max-lg:order-2">
                    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-app-accent/30">
                        <MediaComponent
                            media={media}
                            name="infoGrid"
                            mediaType={mediaType}
                        />
                    </section>

                    <MediaSynopsis
                        media={media}
                    />

                    <MediaComponent
                        media={media}
                        name="extraSections"
                        mediaType={mediaType}
                    />

                    <SimilarMedia
                        mediaType={mediaType}
                        similarMedia={similarMedia}
                    />

                    <Suspense>
                        <MediaCommunityActivity
                            mediaId={media.id}
                            mediaType={mediaType}
                        />
                    </Suspense>

                    <Suspense>
                        <MediaCommunityCollections
                            mediaId={media.id}
                            mediaType={mediaType}
                        />
                    </Suspense>
                </div>
                <div className="col-span-4 space-y-6 max-lg:col-span-1 max-lg:order-1">
                    <div className="space-y-6 max-lg:grid max-lg:grid-cols-2 max-md:grid-cols-1 max-lg:gap-6">
                        <div className="space-y-6 max-lg:mb-0">
                            {!isAnonymous &&
                                <RefreshAndEdit
                                    mediaId={media.id}
                                    mediaType={mediaType}
                                    lastUpdate={media.lastApiUpdate}
                                />
                            }

                            <MediaComponent
                                media={media}
                                name="upComingAlert"
                                mediaType={mediaType}
                            />

                            <Button variant="outline" className="w-full gap-2" asChild>
                                <a href={media.providerData.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="size-4"/>
                                    View on {media.providerData.name}
                                </a>
                            </Button>

                            {userMedia ?
                                <UserMediaDetails
                                    mediaType={mediaType}
                                    userMedia={userMedia}
                                    queryOption={mediaDetailsOptions(mediaType, mediaId)}
                                />
                                :
                                isAnonymous ?
                                    <LockedContent
                                        variant="inline"
                                        showAuthButtons={true}
                                        isAnonymous={isAnonymous}
                                        title="Want to track your progress?"
                                        description="Log-in or register to add this media to your list, track your
                                        progress, add ratings, comments, tags and more."
                                    />
                                    :
                                    <Card>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-lg font-semibold text-slate-200">
                                                Are you interested in this?
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Add this {mediaType} to your list to track your progress.
                                            </p>
                                        </div>
                                        <Button className="w-full mt-2" onClick={handleAddMediaToUser}>
                                            <Plus className="size-4"/> Add to List
                                        </Button>
                                    </Card>
                            }
                            <CollectionsLists
                                mediaId={media.id}
                                mediaType={mediaType}
                                isAnonymous={isAnonymous}
                            />
                        </div>

                        <MediaFollowsSection
                            mediaType={mediaType}
                            isAnonymous={isAnonymous}
                            followsData={followsData}
                        />
                    </div>
                </div>
            </div>
        </PageTitle>
    );
}
