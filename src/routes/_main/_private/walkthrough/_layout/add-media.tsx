import dedent from "dedent";
import {Card} from "@/lib/client/components/ui/card";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import {mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {ExternalLink, Heart, List, MessageCircle, Plus, RotateCcw, Star, Tags} from "lucide-react";
import {ONBOARDING_MOVIE_ID, onboardingAddMediaFixture} from "@/lib/client/components/onboarding/onboarding-fixtures";
import {
    OnboardingContainer,
    OnboardingDemoBox,
    OnboardingFeatureCard,
    OnboardingGrid,
    OnboardingNote,
    OnboardingSection,
    OnboardingSubSection
} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/add-media")({
    component: RouteComponent,
});


function RouteComponent() {
    const { media, userMedia } = onboardingAddMediaFixture;
    const onboardingQueryOption = mediaDetailsOptions(MediaType.MOVIES, ONBOARDING_MOVIE_ID);

    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={List}
                title="The Details Page"
                description={
                    "Once you've found something you like, you'll land on its details page. " +
                    "This is where you can see details about the media and track your progress."
                }
            />

            <OnboardingSubSection
                title="1. Add Media To Your List"
                description="Add the media to your list by clicking the button on the details page."
            >
                <OnboardingDemoBox>
                    <div className="flex flex-col items-center w-full max-w-md shadow-sm">
                        <div className="space-y-6 max-lg:mb-0">
                            <Button variant="outline" className="w-full gap-2" asChild>
                                <a href={media.providerData.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="size-4"/>
                                    View on {media.providerData.name}
                                </a>
                            </Button>
                            <Card>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold text-slate-200">
                                        Are you interested in this?
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Add this {MediaType.MOVIES} to your list to track your progress.
                                    </p>
                                </div>
                                <Button className="w-full mt-2">
                                    <Plus className="size-4"/> Add to List
                                </Button>
                            </Card>
                        </div>
                    </div>
                </OnboardingDemoBox>
            </OnboardingSubSection>

            <OnboardingSubSection
                title="2. Manage The Media"
                description="After adding the media to your list, you will be able to manage it from this same page."
            >
                <OnboardingDemoBox>
                    {!!userMedia &&
                        <div className="max-w-100">
                            <UserMediaDetails
                                preview
                                userMedia={userMedia}
                                mediaType={MediaType.MOVIES}
                                queryOption={onboardingQueryOption}
                            />
                        </div>
                    }
                </OnboardingDemoBox>

                <OnboardingGrid>
                    <OnboardingFeatureCard
                        icon={Plus}
                        title="Status"
                        description={dedent`
                            Set the current status of the media. 
                            For example for movies the options are '${Status.COMPLETED}' or '${Status.PLAN_TO_WATCH}'
                        `}
                    />
                    <OnboardingFeatureCard
                        icon={Star}
                        title={`Rating: ${RatingSystemType.FEELING} or ${RatingSystemType.SCORE}`}
                        description={
                            <div>
                                Give either a score (0-10) or a feeling (6 emoticons system).
                                Default to score, can be changed on the {" "}
                                <Link to="/settings" className="text-app-accent flex items-center gap-1 font-bold">
                                    settings <ExternalLink className="size-3"/>.
                                </Link>
                            </div>
                        }
                    />
                    <OnboardingFeatureCard
                        icon={Heart}
                        title="Favorites"
                        description="Hearting a media adds it to your 'Favorites' section on your profile and for filtering in your list."
                    />
                    <OnboardingFeatureCard
                        icon={RotateCcw}
                        title="Re-watched/Re-Read"
                        description="Add a re-watch/re-read on media. The added time is accounted for in your time stats."
                    />
                    <OnboardingFeatureCard
                        title="Comment"
                        icon={MessageCircle}
                        description="Add a comment for this media. This can be use for filtering in your list."
                    />
                    <OnboardingFeatureCard
                        icon={Tags}
                        title="Tags"
                        description={`
                            Organize your lists by grouping media with custom tags. 
                            Create categories like 'Top Sci-Fi' to quickly filter your list 
                            and find exactly what you are looking for.
                        `}
                    />
                </OnboardingGrid>

                <OnboardingNote title="Info">
                    Some options (Like Episodes and Seasons, or Platform) only appear for specific media types to keep the experience relevant.
                </OnboardingNote>
            </OnboardingSubSection>
        </OnboardingContainer>
    );
}
