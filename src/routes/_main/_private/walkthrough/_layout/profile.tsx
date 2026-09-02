import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {OverviewTab} from "@/lib/client/components/user-profile/OverviewTab";
import {MediaLevels} from "@/lib/client/components/user-profile/MediaLevels";
import {MediaStatsTab} from "@/lib/client/components/user-profile/MediaStatsTab";
import {AchievementsCard} from "@/lib/client/components/user-profile/AchievementCard";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {FollowsUpdates, UserUpdates} from "@/lib/client/components/user-profile/UserUpdates";
import {Activity, ArrowUp10, Award, LayoutGrid, User} from "lucide-react";
import {ONBOARDING_PROFILE_NAME, onboardingProfileFixture} from "@/lib/client/components/onboarding/onboarding-fixtures";
import {OnboardingContainer, OnboardingDemoBox, OnboardingNote, OnboardingSection, OnboardingSubSection} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/profile")({
    component: ProfileOnboarding,
});


function ProfileOnboarding() {
    const apiData = onboardingProfileFixture;
    const username = ONBOARDING_PROFILE_NAME;
    const [activeTab, setActiveTab] = useState<MediaType | "overview">("overview");
    const mediaTabs = createMediaTabItems(getActiveMediaTypes(apiData.userData.userMediaSettings), { leading: "overview" });

    const effectiveActiveTab = mediaTabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={User}
                title="Your Profile"
                description="The profile is the central hub. It showcases your taste, your time spent, and your journey across all types of media."
            >
                <OnboardingNote title="Privacy Tip">
                    Your profile visibility is determined by your settings. You can either make your profile <b>public</b> to share your
                    stats with everybody, or <b>restricted</b> if you prefer them to be accessible only to the Mylists users (default: 'restricted').
                </OnboardingNote>
            </OnboardingSection>

            <OnboardingSubSection
                icon={ArrowUp10}
                title="Leveling System"
                description="Every minute you spend watching, playing, or reading earns you 'Experience (XP)'. Your levels are broken down per activated media."
            >
                <OnboardingDemoBox>
                    <div className="w-xs">
                        <MediaLevels
                            username={username}
                            settings={apiData.userData.userMediaSettings}
                        />
                    </div>
                </OnboardingDemoBox>
            </OnboardingSubSection>

            <OnboardingSubSection
                icon={Activity}
                title="Recent Feed: You & Your Follows"
                description={
                    "Track your progress and never miss an update from the people you follow. " +
                    "You can even remove individual items from your own history at any time."
                }
            >
                <OnboardingDemoBox className="gap-4 max-sm:grid max-sm:grid-cols-1">
                    <div className="max-w-80">
                        <UserUpdates
                            username={username}
                            updates={apiData.userUpdates}
                        />
                    </div>
                    <div className="w-100 max-sm:w-full">
                        <FollowsUpdates
                            username={username}
                            updates={apiData.followsUpdates}
                        />
                    </div>
                </OnboardingDemoBox>

                <OnboardingNote title="Note: Follows System">
                    Hit the follows button on the profile page of another person to see their recent activities on your own profile page.
                </OnboardingNote>
            </OnboardingSubSection>

            <OnboardingSubSection
                icon={LayoutGrid}
                title="The Tabs: Overview & Media"
                description={
                    "The Overview tab is your 'Global' view/total time spent across everything. " +
                    "Switch to a specific media tab (like Games or Movies) to see nerdy stuff " +
                    "like status breakdown, favorites, avg. rating etc... "
                }
            >
                <OnboardingDemoBox className="pt-2">
                    <div className="w-[95%] min-w-0 space-y-6 max-lg:w-3/5 max-sm:mt-4 max-sm:w-full max-sm:space-y-4">
                        <TabHeader
                            tabs={mediaTabs}
                            value={effectiveActiveTab}
                            onValueChange={setActiveTab}
                        />
                        <div className="min-h-113 animate-in fade-in duration-300">
                            {effectiveActiveTab === "overview" ?
                                <OverviewTab
                                    perMedia={apiData.perMediaSummary}
                                    globalStats={apiData.mediaGlobalSummary}
                                    ratingSystem={apiData.userData.ratingSystem}
                                    highlightedMedia={apiData.highlightedMedia.overview}
                                />
                                :
                                <MediaStatsTab
                                    username={username}
                                    ratingSystem={apiData.userData.ratingSystem}
                                    highlightedMedia={apiData.highlightedMedia[activeTab]}
                                    mediaSummary={apiData.perMediaSummary.find((p) => p.mediaType === activeTab)!}
                                />
                            }
                        </div>
                    </div>
                </OnboardingDemoBox>
            </OnboardingSubSection>

            <OnboardingSubSection
                icon={Award}
                title="Recent Achievements"
                description={
                    "Track your progress and showcase your latest achievements. " +
                    "Every achievement features four tiers: Bronze, Silver, Gold, and Platinum, earned through " +
                    "total time spent, genre mastery, 'devotion' (e.g. completing multiple media from the same creator), etc..."
                }
            >
                <OnboardingDemoBox>
                    <div className="max-w-sm min-w-80">
                        <AchievementsCard
                            username={username}
                            achievements={apiData.achievements}
                        />
                    </div>
                </OnboardingDemoBox>
            </OnboardingSubSection>
        </OnboardingContainer>
    );
}
