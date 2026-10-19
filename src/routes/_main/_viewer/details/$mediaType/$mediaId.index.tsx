import {Suspense} from "react";
import {ExternalLink} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MediaHero} from "@/lib/client/components/media/base/MediaHero";
import {resolveMediaTypeActive} from "@/lib/utils/media/list-activation";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {SimilarMedia} from "@/lib/client/components/media/base/SimilarMedia";
import {MediaSynopsis} from "@/lib/client/components/media/base/MediaSynopsis";
import {MediaComponent} from "@/lib/client/components/media/base/MediaComponent";
import {RefreshAndEdit} from "@/lib/client/components/media/base/RefreshAndEdit";
import {UserMediaSection} from "@/lib/client/components/media/base/UserMediaSection";
import {CollectionsLists} from "@/lib/client/components/media/base/CollectionsLists";
import {MediaFollowsSection} from "@/lib/client/components/media/base/MediaFollowsSection";
import {MediaCommunityActivity} from "@/lib/client/components/media/base/MediaCommunityActivity";
import {DisabledMediaListNotice} from "@/lib/client/components/media/base/DisabledMediaListNotice";
import {MediaCommunityCollections} from "@/lib/client/components/media/base/MediaCommunityCollections";
import {mediaCommunityActivityOptions, mediaCommunityCollectionsOptions, mediaDetailsOptions, userMediaDetailsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    context: ({ params: { mediaType, mediaId } }) => ({
        mediaDetailsQueryOptions: mediaDetailsOptions(mediaType, mediaId),
        userMediaQueryOptions: userMediaDetailsOptions(mediaType, mediaId),
        communityCollectionsQueryOptions: mediaCommunityCollectionsOptions(mediaId, mediaType),
        communityActivityQueryOptions: mediaCommunityActivityOptions(mediaId, mediaType, { page: 1, perPage: 8 }),
    }),
    loader: async ({ context, params: { mediaType } }) => {
        const currentUser = context.queryClient.getQueryData(context.authQueryOptions.queryKey);

        const [{ media }] = await Promise.all([
            context.queryClient.query({ ...context.mediaDetailsQueryOptions, staleTime: "static" }),
            currentUser && resolveMediaTypeActive(currentUser.settings, mediaType)
                ? context.queryClient.query(context.userMediaQueryOptions) : undefined,
        ]);

        void context.queryClient.query(context.communityActivityQueryOptions).catch(() => {
        });
        void context.queryClient.query(context.communityCollectionsQueryOptions).catch(() => {
        });

        return { title: media.name };
    },
    component: MediaDetailsPage,
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `${loaderData.title} - MyLists` }] : [],
    }),
});


function MediaDetailsPage() {
    const { currentUser, isAnonymous } = useAuth();
    const { mediaType, mediaId } = Route.useParams();
    const { mediaDetailsQueryOptions, communityCollectionsQueryOptions, communityActivityQueryOptions } = Route.useRouteContext();

    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);
    const { media, followsData, similarMedia } = useSuspenseQuery(mediaDetailsQueryOptions).data;

    return (
        <>
            <MediaHero
                media={media}
                mediaType={mediaType}
            />
            <div className="grid grid-cols-12 gap-8 mx-auto px-4 py-2 max-sm:py-0 max-lg:grid-cols-1">
                <div className="col-span-8 space-y-8 max-lg:col-span-1 max-lg:order-2">
                    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-brand/30">
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
                            mediaId={mediaId}
                            mediaType={mediaType}
                            queryOptions={communityActivityQueryOptions}
                        />
                    </Suspense>

                    <Suspense>
                        <MediaCommunityCollections
                            queryOptions={communityCollectionsQueryOptions}
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
                                    isManual={!media.providerData}
                                    lastUpdate={media.lastApiUpdate}
                                />
                            }

                            <MediaComponent
                                media={media}
                                name="upComingAlert"
                                mediaType={mediaType}
                            />

                            {media.providerData ?
                                <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={media.providerData.url}
                                    className={buttonVariants({ size: "lg", variant: "tame", className: "w-full" })}
                                >
                                    View on {media.providerData.name} <ExternalLink/>
                                </a>
                                :
                                <Button size="lg" variant="tame" className="w-full capitalize" disabled={true}>
                                    {mediaType} added manually
                                </Button>
                            }

                            {isAnonymous ?
                                <LockedContent
                                    variant="inline"
                                    showAuthButtons={true}
                                    isAnonymous={isAnonymous}
                                    title="Want to track your progress?"
                                    description="Log-in or register to add this media to your list, track your
                                    progress, add ratings, comments, tags and more."
                                />
                                :
                                !isMediaTypeActive ?
                                    <DisabledMediaListNotice
                                        mediaType={mediaType}
                                    />
                                    :
                                    <UserMediaSection
                                        mediaId={mediaId}
                                        mediaType={mediaType}
                                    />
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
        </>
    );
}
