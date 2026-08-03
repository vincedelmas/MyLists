import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ArrowUpFromLine, BadgePlus} from "lucide-react";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminMediaOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/media-overview")({
    loader: async ({ context: { queryClient } }) => queryClient.ensureQueryData(adminMediaOverviewOptions),
    component: MediaDashboardPage,
});


function MediaDashboardPage() {
    const apiData = useSuspenseQuery(adminMediaOverviewOptions).data;
    const addedMedia = apiData.addedComparedToLastMonth > 0;

    return (
        <DashboardShell>
            <DashboardHeader
                heading="User Media Overview"
                description="Overview of the user media list statistics and evolution."
            />
            <div className="grid gap-4 grid-cols-5 max-sm:grid-cols-2 max-sm:gap-3 mt-4">
                <StatCard
                    icon={BadgePlus}
                    title="Total Added Media"
                    value={apiData.addedThisMonth}
                    subtitle={`${addedMedia ? "+" : ""}${apiData.addedComparedToLastMonth} compared to last month`}
                />
                {apiData.addedPerMediaType.map((added) => {
                    const updatedMedia = added.comparedToLastMonth > 0;
                    return (
                        <StatCard
                            icon={BadgePlus}
                            key={added.mediaType}
                            value={added.thisMonth}
                            title={"New Added " + capitalize(added.mediaType)}
                            subtitle={`${updatedMedia ? "+" : ""}${added.comparedToLastMonth} compared to last month`}
                        />
                    );
                })}
            </div>
            <div className="grid gap-4 grid-cols-5 max-sm:grid-cols-2 max-sm:gap-3 mt-4">
                <StatCard
                    icon={ArrowUpFromLine}
                    title="Total Updated Media"
                    value={apiData.updatedThisMonth}
                    subtitle="Total media updated this month"
                />
                {apiData.updatedPerMediaType.map((added) => {
                    return (
                        <StatCard
                            key={added.mediaType}
                            icon={ArrowUpFromLine}
                            value={added.thisMonth}
                            subtitle="Updated this month"
                            title={"Updated " + capitalize(added.mediaType)}
                        />
                    );
                })}
            </div>
        </DashboardShell>
    );
}
