import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {getBookEditions} from "@/lib/server/functions/book-editions";
import {BookAddToList} from "@/lib/client/components/media/books/BookEditionPicker";
import {Suspense} from "react";
import {cn} from "@/lib/utils/classnames";
import {ExternalLink, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {Card, CardContent} from "@/lib/client/components/ui/card";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {MediaHero} from "@/lib/client/components/media/base/MediaHero";
import {resolveMediaTypeActive} from "@/lib/utils/media/list-activation";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {SimilarMedia} from "@/lib/client/components/media/base/SimilarMedia";
import {MediaSynopsis} from "@/lib/client/components/media/base/MediaSynopsis";
import {MediaComponent} from "@/lib/client/components/media/base/MediaComponent";
import {RefreshAndEdit} from "@/lib/client/components/media/base/RefreshAndEdit";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {CollectionsLists} from "@/lib/client/components/media/base/CollectionsLists";
import {MediaFollowsSection} from "@/lib/client/components/media/base/MediaFollowsSection";
import {MediaCommunityActivity} from "@/lib/client/components/media/base/MediaCommunityActivity";
import {DisabledMediaListNotice} from "@/lib/client/components/media/base/DisabledMediaListNotice";
import {MediaCommunityCollections} from "@/lib/client/components/media/base/MediaCommunityCollections";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {mediaCommunityActivityOptions, mediaCommunityCollectionsOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/")({
    validateSearch: z.object({ editionId: z.coerce.number().int().positive().optional().catch(undefined) }),
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    context: ({ params: { mediaType, mediaId } }) => ({
        mediaDetailsQueryOptions: mediaDetailsOptions(mediaType, mediaId),
        communityCollectionsQueryOptions: mediaCommunityCollectionsOptions(mediaId, mediaType),
        communityActivityQueryOptions: mediaCommunityActivityOptions(mediaId, mediaType, { page: 1, perPage: 8 }),
    }),
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(context.mediaDetailsQueryOptions);
        void context.queryClient.prefetchQuery(context.communityCollectionsQueryOptions);
        void context.queryClient.prefetchQuery(context.communityActivityQueryOptions);
    },
    component: MediaDetailsPage,
});


function MediaDetailsPage() {
    const { currentUser, isAnonymous } = useAuth();
    const { mediaType, mediaId } = Route.useParams();
    const { editionId } = Route.useSearch();
    const navigate = Route.useNavigate();
    const { mediaDetailsQueryOptions, communityCollectionsQueryOptions, communityActivityQueryOptions } = Route.useRouteContext();

    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);
    const addMediaToListMutation = useAddMediaToListMutation(mediaDetailsQueryOptions);
    const { media, userMedia, followsData, similarMedia, bookEdition } = useSuspenseQuery(mediaDetailsQueryOptions).data;
    const editions = useQuery({queryKey: ["bookEditions", mediaId], queryFn: () => getBookEditions({data: {mediaId}}),
        enabled: mediaType === MediaType.BOOKS && !userMedia && !!editionId});
    const selectedEdition = bookEdition ?? (!userMedia ? editions.data?.find(edition => edition.id === editionId) : null);
    const displayMedia = mediaType === MediaType.BOOKS ? {...media,
        name: selectedEdition?.name ?? media.name,
        synopsis: selectedEdition?.synopsis ?? media.synopsis,
        imageCover: userMedia?.customCover ?? (selectedEdition && !selectedEdition.imageCover.endsWith("/default.jpg") ? selectedEdition.imageCover : media.imageCover),
        providerData: {...media.providerData, url: selectedEdition ? `https://books.google.com/books?id=${encodeURIComponent(selectedEdition.apiId)}` : media.providerData.url},
    } : media;

    const handleAddMediaToUser = () => {
        addMediaToListMutation.mutate({ data: { mediaType, mediaId: media.id } });
    };

    return (
        <PageTitle title={displayMedia.name} onlyHelmet>
            <MediaHero
                media={displayMedia}
                mediaType={mediaType}
            />
            <div className="grid grid-cols-12 gap-8 mx-auto px-4 py-2 max-sm:py-0 max-lg:grid-cols-1">
                <div className="col-span-8 space-y-8 max-lg:col-span-1 max-lg:order-2">
                    {mediaType === MediaType.BOOKS && selectedEdition && <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm" data-testid="book-edition-presentation">
                        <p className="font-medium">{userMedia ? "Your edition" : "Selected edition"}{selectedEdition.language ? ` · ${formatLocaleName(selectedEdition.language, "language")}` : ""}</p>
                        <p className="mt-1 text-muted-foreground">{[selectedEdition.publishers, selectedEdition.releaseDate ? `Edition published ${selectedEdition.releaseDate.slice(0, 4)}` : null].filter(Boolean).join(" · ")}</p>
                        <p className="mt-1 text-muted-foreground">Shared book: {media.name}. Readers and ratings include all editions.</p>
                    </div>}
                    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-brand/30">
                        <MediaComponent
                            media={media}
                            name="infoGrid"
                            mediaType={mediaType}
                        />
                    </section>

                    <MediaSynopsis
                        media={displayMedia}
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
                                    lastUpdate={media.lastApiUpdate}
                                />
                            }

                            <MediaComponent
                                media={media}
                                name="upComingAlert"
                                mediaType={mediaType}
                            />

                            <a
                                target="_blank"
                                rel="noopener noreferrer"
                                href={displayMedia.providerData.url}
                                className={cn(buttonVariants({ size: "lg", variant: "tame", className: "w-full" }))}
                            >
                                View on {media.providerData.name} <ExternalLink/>
                            </a>

                            {userMedia && isMediaTypeActive ?
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
                                    !isMediaTypeActive ?
                                        <DisabledMediaListNotice
                                            mediaType={mediaType}
                                        />
                                        :
                                        mediaType === MediaType.BOOKS ?
                                            <BookAddToList key={`${mediaId}:${editionId ?? "none"}`} mediaId={mediaId} initialEditionId={editionId} queryOption={mediaDetailsQueryOptions}
                                                onEditionChange={id => {void navigate({search: {editionId: id ?? undefined}, replace: true});}}/>
                                            :
                                        <Card>
                                            <CardContent className="text-center space-y-4">
                                                <div className="space-y-3">
                                                    <h3 className="text-lg font-semibold text-foreground">
                                                        Are you interested in this?
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Add this {mediaType} to your list to track your progress.
                                                    </p>
                                                </div>
                                                <Button className="w-full" onClick={handleAddMediaToUser}>
                                                    <Plus/> Add to List
                                                </Button>
                                            </CardContent>
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
