import {profileSearchSchema} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {MediaLevels} from "@/lib/client/components/user-profile/MediaLevels";
import {OverviewTab} from "@/lib/client/components/user-profile/OverviewTab";
import {MediaStatsTab} from "@/lib/client/components/user-profile/MediaStatsTab";
import {ProfileFollows} from "@/lib/client/components/user-profile/ProfileFollows";
import {OnboardingModal} from "@/lib/client/components/user-profile/OnboardingModal";
import {AchievementsCard} from "@/lib/client/components/user-profile/AchievementCard";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {continueOptions} from "@/lib/client/react-query/query-options/continue.options";
import {ProfilePortalGrid} from "@/lib/client/components/user-profile/ProfilePortalGrid";
import {FollowsUpdates, UserUpdates} from "@/lib/client/components/user-profile/UserUpdates";
import {profileOptions, profileRecentFeedOptions, profileSummaryOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/")({
    validateSearch: profileSearchSchema,
    context: ({ params: { username } }) => ({
        profileQueryOptions: profileOptions(username),
        continueQueryOptions: continueOptions(username),
        summaryQueryOptions: profileSummaryOptions(username),
        recentFeedQueryOptions: profileRecentFeedOptions(username),
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.fetchQuery(context.profileQueryOptions),
            context.queryClient.fetchQuery(context.summaryQueryOptions),
            context.queryClient.fetchQuery(context.continueQueryOptions),
            context.queryClient.fetchQuery(context.recentFeedQueryOptions),
        ]);
    },
    component: ProfileMain,
});


function ProfileMain() {
    const { profileQueryOptions, recentFeedQueryOptions, summaryQueryOptions, continueQueryOptions } = Route.useRouteContext();

    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const { activeTab } = Route.useSearch();
    const summary = useSuspenseQuery(summaryQueryOptions).data;
    const apiData = useSuspenseQuery(profileQueryOptions).data;
    const inProgress = useSuspenseQuery(continueQueryOptions).data;
    const recentFeed = useSuspenseQuery(recentFeedQueryOptions).data;
    const activeMediaTypes = getActiveMediaTypes(summary.userMediaSettings);

    const mediaTabs = createMediaTabItems(activeMediaTypes, { leading: "overview", size: 15 });
    const currentTab = mediaTabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

    return (
        <div className="grid grid-cols-[0.26fr_0.74fr] gap-6 pt-2 max-lg:grid-cols-5 max-sm:grid-cols-1">
            {currentUser && currentUser.showOnboarding &&
                <OnboardingModal/>
            }

            <div className="space-y-4 max-lg:col-span-2 max-sm:space-y-6">
                <MediaLevels
                    username={username}
                    settings={summary.userMediaSettings}
                />
                <ProfilePortalGrid
                    username={username}
                />
                <UserUpdates
                    username={username}
                    updates={recentFeed}
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
                    value={currentTab}
                    renderTrigger={(tab, props) =>
                        <Link
                            {...props}
                            resetScroll={false}
                            params={{ username }}
                            to="/profile/$username"
                            search={{ activeTab: tab.id === "overview" ? undefined : tab.id }}
                        />
                    }
                />
                <div className="animate-in fade-in duration-300">
                    {currentTab === "overview" ?
                        <OverviewTab
                            key={username}
                            perMedia={summary.perMediaSummary}
                            inProgressMedia={inProgress.items}
                            showContinue={apiData.showContinue}
                            globalStats={summary.mediaGlobalSummary}
                            ratingSystem={apiData.userData.ratingSystem}
                            isCurrent={currentUser?.id === apiData.userData.id}
                            highlightedMedia={apiData.highlightedMedia.overview}
                        />
                        :
                        <MediaStatsTab
                            username={username}
                            ratingSystem={apiData.userData.ratingSystem}
                            highlightedMedia={apiData.highlightedMedia[currentTab]}
                            mediaSummary={summary.perMediaSummary.find((p) => p.mediaType === currentTab)!}
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
