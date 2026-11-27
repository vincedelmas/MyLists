import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Award, Database, RefreshCw} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminAchievementsOptions} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
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
    const triggerTask = useAdminTriggerTaskMutation();
    const { achievementsQueryOptions } = Route.useRouteContext();
    const achievements = useSuspenseQuery(achievementsQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={Award}
                title="Achievements"
                asideLabel="Catalog"
                eyebrow="Administration"
                asideValue={formatNumber(achievements.length)}
                description="Inspect code-defined achievements, active-user unlock counts (Lvl 5+), eligible pools, and rarity percentages."
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    disabled={triggerTask.isPending}
                    onClick={() => triggerTask.mutate({ data: { taskName: "seed-achievements", input: {} } })}
                >
                    <Database data-icon="inline-start"/>
                    Sync catalog
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={triggerTask.isPending}
                    onClick={() => triggerTask.mutate({ data: { taskName: "calculate-achievements", input: {} } })}
                >
                    <RefreshCw data-icon="inline-start"/>
                    Recalculate all &amp; rarity
                </Button>
            </div>

            <AchievementDirectory
                achievements={achievements}
            />
        </DashboardShell>
    );
}
