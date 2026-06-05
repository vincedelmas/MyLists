import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ArrowUpFromLine, BadgePlus} from "lucide-react";
import {UserStats} from "@/lib/client/components/admin/UserStats";
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
                <UserStats
                    icon={BadgePlus}
                    title="Total Added Media"
                    value={apiData.addedThisMonth}
                    description={`${addedMedia ? "+" : ""}${apiData.addedComparedToLastMonth} compared to last month`}
                />
                {apiData.addedPerMediaType.map((added) => {
                    const updatedMedia = added.comparedToLastMonth > 0;
                    return (
                        <UserStats
                            icon={BadgePlus}
                            key={added.mediaType}
                            value={added.thisMonth}
                            title={"New Added " + capitalize(added.mediaType)}
                            description={`${updatedMedia ? "+" : ""}${added.comparedToLastMonth} compared to last month`}
                        />
                    );
                })}
            </div>
            <div className="grid gap-4 grid-cols-5 max-sm:grid-cols-2 max-sm:gap-3 mt-4">
                <UserStats
                    icon={ArrowUpFromLine}
                    title="Total Updated Media"
                    value={apiData.updatedThisMonth}
                    description="Total media updated this month"
                />
                {apiData.updatedPerMediaType.map((added) => {
                    return (
                        <UserStats
                            key={added.mediaType}
                            icon={ArrowUpFromLine}
                            value={added.thisMonth}
                            description="Updated this month"
                            title={"Updated " + capitalize(added.mediaType)}
                        />
                    );
                })}
            </div>
        </DashboardShell>
    );
}
