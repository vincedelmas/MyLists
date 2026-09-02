import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {Award} from "lucide-react";
import {capitalize} from "@/lib/utils/text-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {formatNumber} from "@/lib/utils/number-formatting";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {achievementOptions} from "@/lib/client/react-query/query-options";
import {AchievementCard} from "@/lib/client/components/achievements/AchievementCard";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {AchievementSummary} from "@/lib/client/components/achievements/AchievementSummary";


export const Route = createFileRoute("/_main/_viewer/achievements/$username/_header/")({
    context: ({ params: { username } }) => ({
        achievementQueryOptions: achievementOptions(username),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.achievementQueryOptions);
    },
    component: AchievementPage,
});


function AchievementPage() {
    const { username } = Route.useParams();
    const { achievementQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(achievementQueryOptions).data;
    const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
    const mediaTabs = createMediaTabItems(apiData.userActivatedMediaTypes, { leading: "all" });
    const mediaAchievements = apiData.result.filter((r) => activeTab === "all" || r.mediaType === activeTab);
    const activeSummary = apiData.summary[activeTab];
    return (
        <div className="mb-8 flex flex-col pt-8">
            <PageHeader
                eyebrowIcon={Award}
                eyebrow="Milestones reached"
                title={`${username}'s achievements`}
                description={`See what ${username} has earned and how close the next achievements are.`}
                navigation={
                    <TabHeader
                        tabs={mediaTabs}
                        activeTab={activeTab}
                        className="max-sm:px-3"
                        setActiveTab={setActiveTab}
                    >
                        <QuickActions username={username}/>
                    </TabHeader>
                }
            />

            <div className="pb-12">
                <AchievementSummary
                    summary={activeSummary}
                />

                <div className="flex items-end justify-between gap-5 pb-4 pt-8">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {activeTab === "all"
                                ? "All milestones"
                                : `${capitalize(activeTab)} milestones`
                            }
                        </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatNumber(mediaAchievements.length)} {mediaAchievements.length === 1 ? "challenge" : "challenges"}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
                    {mediaAchievements.map((achievement) =>
                        <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
