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


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/release-calendar")({
    component: ReleaseCalendarOnboarding,
});


function ReleaseCalendarOnboarding() {
    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={CalendarDays}
                title="Release Calendar"
                description={
                    <>
                        Stay ahead of the curve. The <span className="text-foreground font-semibold">Release Calendar</span> page
                        shows dated releases from your lists in a month or week view, so you can look ahead or revisit past releases.
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
                        highlightReleaseCalendar
                        username={ONBOARDING_PROFILE_NAME}
                        settings={onboardingProfileFixture.userData.userMediaSettings}
                    />
                </OnboardingDemoBox>
            </OnboardingSubSection>

            <OnboardingSubSection
                title="What's inside?"
                description="Browse months or weeks, jump to today, and filter by media type. Your selected period and filter stay in the URL."
            >
                <OnboardingNote title="Note: Contextual Viewing">
                    The releases shown are filtered based on the <strong>Media Types</strong> you have enabled in your settings.
                    If you enable "Games" in your settings, game releases will automatically start appearing in your Release Calendar!
                </OnboardingNote>

                <OnboardingGrid>
                    <OnboardingFeatureCard
                        icon={Calendar}
                        title="Release Dates"
                        description="See past and future movie and game releases. Items without a release date are not shown."
                    />
                    <OnboardingFeatureCard
                        icon={Clock}
                        title="Next Episodes"
                        description="Series and Anime show only the next known episode. Past episodes and full schedules are not available yet."
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
