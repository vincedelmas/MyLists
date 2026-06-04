import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {OverviewTab} from "@/lib/client/components/user-profile/OverviewTab";
import {MediaLevels} from "@/lib/client/components/user-profile/MediaLevels";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {MediaStatsTab} from "@/lib/client/components/user-profile/MediaStatsTab";
import {profileOptions} from "@/lib/client/react-query/query-options";
import {AchievementsCard} from "@/lib/client/components/user-profile/AchievementCard";
import {FollowsUpdates, UserUpdates} from "@/lib/client/components/user-profile/UserUpdates";
import {Activity, ArrowBigUpDash, ArrowUp10, Award, ChartNoAxesColumn, LayoutGrid, User} from "lucide-react";
import {OnboardingContainer, OnboardingDemoBox, OnboardingNote, OnboardingSection, OnboardingSubSection} from "@/lib/client/components/onboarding/OnBoardingShared";


const username = "DemoProfile";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/profile")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(profileOptions(username));
    },
    component: ProfileOnboarding,
});


function ProfileOnboarding() {
    const apiData = useSuspenseQuery(profileOptions(username)).data;
    const [activeTab, setActiveTab] = useState<MediaType | "overview">("overview");
    const activeMediaTypes = apiData.userData.userMediaSettings.filter((s) => s.active).map((s) => s.mediaType);

    const mediaTabs: TabItem<MediaType | "overview">[] = [
        {
            id: "overview",
            isAccent: true,
            label: "Overview",
            icon: <MainThemeIcon size={15} type="overview"/>,
        },
        ...activeMediaTypes.map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

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
                title="Recent Activity: You & Your Follows"
                description={
                    "Track your progress and never miss an update from the people you follow. " +
                    "You can even remove individual items from your own history at any time."
                }
            >
                <OnboardingDemoBox className="gap-8 max-sm:grid max-sm:grid-cols-1">
                    <UserUpdates
                        username={username}
                        updates={apiData.userUpdates}
                    />
                    <FollowsUpdates
                        username={username}
                        updates={apiData.followsUpdates}
                    />
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
                <OnboardingDemoBox className="grid grid-cols-[0.26fr_0.74fr] gap-6 pt-2 max-lg:grid-cols-5 max-sm:grid-cols-1">
                    <div className="space-y-6 max-lg:col-span-3 max-sm:col-span-2 max-sm:space-y-4 max-sm:mt-4">
                        <TabHeader
                            tabs={mediaTabs}
                            setActiveTab={setActiveTab}
                            activeTab={effectiveActiveTab}
                        />
                        <div className="min-h-113 animate-in fade-in duration-300">
                            {effectiveActiveTab === "overview" ?
                                <OverviewTab
                                    username={username}
                                    perMedia={apiData.perMediaSummary}
                                    globalStats={apiData.mediaGlobalSummary}
                                    ratingSystem={apiData.userData.ratingSystem}
                                    highlightedMedia={apiData.highlightedMedia.overview}
                                />
                                :
                                <MediaStatsTab
                                    username={username}
                                    ratingSystem={apiData.userData.ratingSystem}
                                    mediaSummary={apiData.perMediaSummary.find((p) => p.mediaType === activeTab)!}
                                    highlightedMedia={apiData.highlightedMedia[activeTab]}
                                />
                            }
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-25 bg-app-accent text-primary-foreground font-bold text-[10px]
                    px-2 py-1 rounded flex items-center gap-1">
                        ACCESS ADVANCED STATS<ArrowBigUpDash className="size-3 animate-bounce"/>
                    </div>
                </OnboardingDemoBox>

                <OnboardingNote title="Advanced Stats" icon={ChartNoAxesColumn}>
                    Want to see your progress in numbers? The <b>Advanced Stats</b> dashboard offers a high-level summary
                    of your data, plus media-type data tailored to your lists (Movies, Books, Games, etc.).
                </OnboardingNote>
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
                    <div className="max-w-sm">
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
