import {useState} from "react";
import {MediaType, sortByMediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {MediaLevels} from "@/lib/client/components/profile/MediaLevels";
import {OverviewTab} from "@/lib/client/components/profile/OverviewTab";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {MediaStatsTab} from "@/lib/client/components/profile/MediaStatsTab";
import {ProfileFollows} from "@/lib/client/components/profile/ProfileFollows";
import {profileOptions} from "@/lib/client/react-query/query-options";
import {OnboardingModal} from "@/lib/client/components/profile/OnboardingModal";
import {AchievementsCard} from "@/lib/client/components/profile/AchievementCard";
import {FollowsUpdates, UserUpdates} from "@/lib/client/components/profile/UserUpdates";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/")({
    loader: async ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(profileOptions(username));
    },
    component: ProfileMain,
});


function ProfileMain() {
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const apiData = useSuspenseQuery(profileOptions(username)).data;
    const [activeTab, setActiveTab] = useState<MediaType | "overview">("overview");
    const activeMediaTypes = sortByMediaType(
        apiData.userData.userMediaSettings.filter((s) => s.active),
        ({ mediaType }) => mediaType,
    ).map(({ mediaType }) => mediaType);

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
        <div className="grid grid-cols-[0.26fr_0.74fr] gap-6 pt-2 max-lg:grid-cols-5 max-sm:grid-cols-1">
            {currentUser && currentUser.showOnboarding &&
                <OnboardingModal/>
            }

            <div className="space-y-4 max-lg:col-span-2 max-sm:space-y-6">
                <MediaLevels
                    username={username}
                    settings={apiData.userData.userMediaSettings}
                />
                <UserUpdates
                    username={username}
                    updates={apiData.userUpdates}
                />
                <ProfileFollows
                    username={username}
                    follows={apiData.userFollows}
                    followsCount={apiData.followsCount}
                />
            </div>

            <div className="space-y-6 max-lg:col-span-3 max-sm:col-span-2 max-sm:space-y-4 max-sm:mt-4">
                <TabHeader
                    tabs={mediaTabs}
                    setActiveTab={setActiveTab}
                    activeTab={effectiveActiveTab}
                />
                <div className="animate-in fade-in duration-300">
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
                            highlightedMedia={apiData.highlightedMedia[activeTab]}
                            mediaSummary={apiData.perMediaSummary.find((p) => p.mediaType === activeTab)!}
                        />
                    }
                </div>
                <div className="grid grid-cols-[0.42fr_0.58fr] gap-6 pt-6 border-t-2 max-lg:grid-cols-1 max-sm:grid-cols-1">
                    <div className="max-lg:order-2">
                        <AchievementsCard
                            key={username}
                            username={username}
                            achievements={apiData.achievements}
                        />
                    </div>
                    <FollowsUpdates
                        username={username}
                        updates={apiData.followsUpdates}
                    />
                </div>
            </div>
        </div>
    );
}
