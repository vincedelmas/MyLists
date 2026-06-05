import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {achievementOptions} from "@/lib/client/react-query/query-options";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {AchievementCard} from "@/lib/client/components/achievements/AchievementCard";
import {AchievementSummary} from "@/lib/client/components/achievements/AchievementSummary";


export const Route = createFileRoute("/_main/_viewer/achievements/$username/_header/")({
    loader: async ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(achievementOptions(username));
    },
    component: AchievementPage,
});


function AchievementPage() {
    const { username } = Route.useParams();
    const apiData = useSuspenseQuery(achievementOptions(username)).data;

    const mediaTypes = apiData.userActivatedMediaTypes;
    const [activeTab, setActiveTab] = useState<MediaType | "all">("all");
    const mediaAchievements = apiData.result.filter((r) => activeTab === "all" && mediaTypes.includes(r.mediaType) || r.mediaType === activeTab);

    const mediaTabs: TabItem<"all" | MediaType>[] = [
        {
            id: "all",
            label: "All",
            isAccent: true,
            icon: <MainThemeIcon size={15} type="all"/>,
        },
        ...mediaTypes.map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

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
