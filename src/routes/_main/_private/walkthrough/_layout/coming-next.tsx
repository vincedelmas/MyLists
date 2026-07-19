import {createFileRoute} from "@tanstack/react-router";
import {MyMediaMenu} from "@/lib/client/components/navbar/MyMediaMenu";
import {Bell, Calendar, CalendarDays, Clock, Gamepad2, MousePointer2} from "lucide-react";
import {ONBOARDING_PROFILE_NAME, onboardingProfileFixture} from "@/lib/client/components/onboarding/onboarding-fixtures";
import {
    OnboardingContainer,
    OnboardingDemoBox,
    OnboardingFeatureCard,
    OnboardingGrid,
    OnboardingNote,
    OnboardingSection,
    OnboardingSubSection
} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/coming-next")({
    component: ComingNextOnboarding,
});


function ComingNextOnboarding() {
    return (
        <OnboardingContainer>
            <OnboardingSection
                title="Coming Next"
                icon={CalendarDays}
                description={
                    <>
                        Stay ahead of the curve. The <span className="text-primary font-semibold">Coming Next</span> page
                        aggregates all upcoming releases for the media types you track, so you never miss a premiere.
                    </>
                }
            />

            <OnboardingSubSection
                icon={MousePointer2}
                title="Where to find it"
                description={<>Access your release calendar directly from the navbar under the <b>MyMedia</b> menu.</>}
            >
                <OnboardingDemoBox>
                    <MyMediaMenu
                        preview
                        highlightComingNext
                        username={ONBOARDING_PROFILE_NAME}
                        settings={onboardingProfileFixture.userData.userMediaSettings}
                    />
                </OnboardingDemoBox>
            </OnboardingSubSection>

            <OnboardingSubSection
                title="What's inside?"
                description="The page provides a chronological view of upcoming air dates and releases."
            >
                <OnboardingNote title="Note: Contextual Viewing">
                    The releases shown are filtered based on the <strong>Media Types</strong> you have enabled in your settings.
                    If you enable "Games" in your settings, game releases will automatically start appearing in your Coming Next feed!
                </OnboardingNote>

                <OnboardingGrid>
                    <OnboardingFeatureCard
                        icon={Calendar}
                        title="Release Dates"
                        description="View exact dates for movie theater releases, game launches, and series airing dates."
                    />
                    <OnboardingFeatureCard
                        icon={Clock}
                        title="Episode Countdowns"
                        description="For Series and Anime, see how many days or hours remain until the next episode airs."
                    />
                    <OnboardingFeatureCard
                        icon={Gamepad2}
                        title="Platform Sync"
                        description="Release data is automatically pulled from their respective providers."
                    />
                    <OnboardingFeatureCard
                        icon={Bell}
                        title="Notifications"
                        description="Receive a notification 7 days in advance when media you track are about to be released."
                    />
                </OnboardingGrid>
            </OnboardingSubSection>
        </OnboardingContainer>
    );
}
