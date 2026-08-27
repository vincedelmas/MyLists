import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
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

    return (
        <>
            <div className="space-y-6">
                <TabHeader tabs={mediaTabs} activeTab={activeTab} setActiveTab={setActiveTab}>
                    <QuickActions
                        username={username}
                    />
                </TabHeader>

                <AchievementSummary
                    summary={apiData.summary[activeTab]}
                />

                <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
                    {mediaAchievements.map((achievement) =>
                        <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
