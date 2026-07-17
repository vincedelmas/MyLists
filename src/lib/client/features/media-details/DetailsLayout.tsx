import type {ReactNode} from "react";
import {ExternalLink, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Card} from "@/lib/client/components/ui/card";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import type {MediaDetailsPage} from "@/lib/contracts/media/details";
import {MediaHero} from "@/lib/client/components/media/base/MediaHero";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {SimilarMedia} from "@/lib/client/components/media/base/SimilarMedia";
import {MediaSynopsis} from "@/lib/client/components/media/base/MediaSynopsis";
import {RefreshAndEdit} from "@/lib/client/components/media/base/RefreshAndEdit";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {CollectionsLists} from "@/lib/client/components/media/base/CollectionsLists";
import {MediaFollowsSection} from "@/lib/client/components/media/base/MediaFollowsSection";
import {DetailsExtraSection} from "@/lib/client/features/media-details/DetailsExtraSection";
import type {KindProgressMetadata} from "@/lib/client/components/media/family-component.types";
import {MediaCommunityActivity} from "@/lib/client/components/media/base/MediaCommunityActivity";
import {DisabledMediaListNotice} from "@/lib/client/components/media/base/DisabledMediaListNotice";
import {MediaCommunityCollections} from "@/lib/client/components/media/base/MediaCommunityCollections";
import type {UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface DetailsLayoutProps {
    infoGrid: ReactNode;
    overTitle: ReactNode;
    underTitle: ReactNode;
    details: MediaDetailsPage;
    extraSections?: ReactNode;
    upcomingAlert?: ReactNode;
    alternateTitle?: string | null;
    queryOption: UserMediaQueryOption;
    allowDefaultBookCoverEdit?: boolean;
    progressMetadata: KindProgressMetadata;
}


export const DetailsLayout = (props: DetailsLayoutProps) => {
    const {
        details,
        infoGrid,
        overTitle,
        underTitle,
        queryOption,
        extraSections,
        upcomingAlert,
        alternateTitle,
        progressMetadata,
        allowDefaultBookCoverEdit,
    } = props;

    const { currentUser, isAnonymous } = useAuth();
    const { kind, media, userMedia, followsData, similarMedia } = details;
    const addMediaToListMutation = useAddMediaToListMutation(queryOption);
    const isMediaTypeActive = currentUser?.settings.some((s) => s.mediaType === kind && s.active) ?? false;

    const handleAddMediaToUser = () => {
        addMediaToListMutation.mutate({ data: { mediaType: kind, mediaId: media.id } });
    };

    return (
        <PageTitle title={media.name} onlyHelmet>
            <MediaHero
                media={media}
                overTitle={overTitle}
                underTitle={underTitle}
                alternateTitle={alternateTitle}
                allowDefaultBookCoverEdit={allowDefaultBookCoverEdit}
            />
            <div className="grid grid-cols-12 gap-8 mx-auto px-4 py-2 max-sm:py-0 max-lg:grid-cols-1">
                <div className="col-span-8 space-y-8 max-lg:col-span-1 max-lg:order-2">
                    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-app-accent/30">
                        {infoGrid}
                    </section>

                    <MediaSynopsis
                        media={media}
                    />

                    {extraSections}

                    <SimilarMedia
                        mediaType={kind}
                        similarMedia={similarMedia}
                    />

                    <DetailsExtraSection title="Community activity">
                        <MediaCommunityActivity
                            mediaType={kind}
                            mediaId={media.id}
                        />
                    </DetailsExtraSection>

                    <DetailsExtraSection title="Community collections">
                        <MediaCommunityCollections
                            mediaType={kind}
                            mediaId={media.id}
                        />
                    </DetailsExtraSection>
                </div>
                <div className="col-span-4 space-y-6 max-lg:col-span-1 max-lg:order-1">
                    <div className="space-y-6 max-lg:grid max-lg:grid-cols-2 max-md:grid-cols-1 max-lg:gap-6">
                        <div className="space-y-6 max-lg:mb-0">
                            {!isAnonymous &&
                                <RefreshAndEdit
                                    mediaType={kind}
                                    mediaId={media.id}
                                    lastUpdate={media.lastApiUpdate}
                                />
                            }

                            {upcomingAlert}

                            <Button variant="outline" className="w-full gap-2" asChild>
                                <a href={media.providerData.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="size-4"/>
                                    View on {media.providerData.name}
                                </a>
                            </Button>

                            {userMedia && isMediaTypeActive ?
                                <UserMediaDetails
                                    userMedia={userMedia}
                                    queryOption={queryOption}
                                    progressMetadata={progressMetadata}
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
                                            mediaType={kind}
                                        />
                                        :
                                        <Card>
                                            <div className="text-center space-y-2">
                                                <h3 className="text-lg font-semibold text-slate-200">
                                                    Are you interested in this?
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Add this {kind} to your list to track your progress.
                                                </p>
                                            </div>
                                            <Button className="w-full mt-2" onClick={handleAddMediaToUser}>
                                                <Plus className="size-4"/> Add to List
                                            </Button>
                                        </Card>
                            }
                            <CollectionsLists
                                mediaType={kind}
                                mediaId={media.id}
                                isAnonymous={isAnonymous}
                            />
                        </div>

                        <MediaFollowsSection
                            isAnonymous={isAnonymous}
                            followsData={followsData}
                        />
                    </div>
                </div>
            </div>
        </PageTitle>
    );
};
