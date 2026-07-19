import {createFileRoute} from "@tanstack/react-router";
import {ArrowRight, List, MousePointer2, Settings} from "lucide-react";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {ONBOARDING_PROFILE_NAME} from "@/lib/client/components/onboarding/onboarding-fixtures";
import {OnboardingContainer, OnboardingDemoBox, OnboardingNote, OnboardingSection, OnboardingSubSection} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/activate-lists")({
    component: ActiveListsOnboarding,
});


function ActiveListsOnboarding() {
    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={List}
                title="Activate More Lists"
                description={
                    <span>
                        By default, MyLists tracks <b>Series & Movies</b>. If you want to track <b>Anime</b>, <b>Games</b>,
                        {" "}<b>Books</b>, or <b>Manga</b>, you need to enable them in your settings.
                    </span>
                }
            />

            <OnboardingSubSection
                icon={MousePointer2}
                title="How to get there"
                description={
                    "Add the media to your list by clicking the button on the details page. " +
                    "You can also view the media on the provider's website."
                }
            >
                <OnboardingDemoBox>
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2 px-6 py-2 bg-background border rounded-lg shadow-xs">
                            <ProfileIcon
                                fallbackSize="text-base"
                                className="size-10 border-none"
                                user={{ name: ONBOARDING_PROFILE_NAME, image: "" }}
                            />
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground"/>
                        <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-xs">
                            <Settings className="size-4"/> Settings
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground"/>
                        <div className="flex items-center gap-2 px-5 py-2 bg-app-accent/20 border border-app-accent/50 rounded-lg font-semibold shadow-xs">
                            Content & Lists
                        </div>
                    </div>
                </OnboardingDemoBox>

                <OnboardingNote title="Info">
                    After enabling a list and updating the settings, this will make it appear in
                    your <b>MyMedia</b> and the <b>SearchBar Dropdown</b> navigation menu automatically!
                </OnboardingNote>
            </OnboardingSubSection>
        </OnboardingContainer>
    );
}
