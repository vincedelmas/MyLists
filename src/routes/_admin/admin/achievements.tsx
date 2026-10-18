import {Award} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminAchievementsOptions} from "@/lib/client/react-query/query-options/admin.options";
import {AchievementDirectory} from "@/lib/client/components/admin/achievements/AchievementDirectory";


export const Route = createFileRoute("/_admin/admin/achievements")({
    context: () => ({
        achievementsQueryOptions: adminAchievementsOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.achievementsQueryOptions, staleTime: "static" });
    },
    component: AchievementPage,
});


function AchievementPage() {
    const { achievementsQueryOptions } = Route.useRouteContext();
    const achievements = useSuspenseQuery(achievementsQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={Award}
                title="Achievements"
                asideLabel="Definitions"
                eyebrow="Administration"
                asideValue={formatNumber(achievements.length)}
                description="Manage achievement names, descriptions, and the thresholds for every tier."
            />
            <AchievementDirectory
                achievements={achievements}
            />
        </DashboardShell>
    );
}
