import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {AchievementCard} from "@/lib/client/components/achievements/AchievementCard";
import {achievementOptions} from "@/lib/client/react-query/query-options";
import {AchievementSummary} from "@/lib/client/components/achievements/AchievementSummary";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/achievements")({
    loader: async ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(achievementOptions(username));
    },
    component: AchievementPage,
});


function AchievementPage() {
    const { mediaType, username } = Route.useParams();
    const apiData = useSuspenseQuery(achievementOptions(username)).data;
    const mediaAchievements = apiData.result.filter((r) => r.mediaType === mediaType);

    return (
        <>
            <div className="space-y-6">
                <AchievementSummary
                    summary={apiData.summary[mediaType]}
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
