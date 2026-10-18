import {capitalize} from "@/lib/utils/formatting/text";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {ArrowLeftRight, BadgePlus, LibraryBig, ListChecks} from "lucide-react";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {StatsSectionHeader} from "@/lib/client/components/media-stats/StatsSectionHeader";
import {adminMediaOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/media-overview")({
    context: () => ({
        mediaOverviewQueryOptions: adminMediaOverviewOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.mediaOverviewQueryOptions, staleTime: "static" });
    },
    component: MediaDashboardPage,
});


function MediaDashboardPage() {
    const { mediaOverviewQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(mediaOverviewQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                asideValue="This month"
                eyebrow="Administration"
                eyebrowIcon={LibraryBig}
                title="User media overview"
                asideLabel="Reporting period"
                description="How users are adding to and updating their media lists across MyLists."
            />
            <section className="my-6 rounded-xl border p-5 shadow-xs sm:p-6" aria-label="Monthly media summary">
                <CompactStatsGrid
                    columns={3}
                    items={[
                        {
                            label: "List entries added",
                            note: "Across all users’ lists",
                            icon: <BadgePlus className="size-4"/>,
                            value: formatNumber(apiData.addedThisMonth),
                        },
                        {
                            label: "Media updated",
                            icon: <ListChecks className="size-4"/>,
                            value: formatNumber(apiData.updatedThisMonth),
                            note: "Distinct titles updated in users’ lists",
                        },
                        {
                            label: "Change in additions",
                            icon: <ArrowLeftRight className="size-4"/>,
                            note: `${formatNumber(apiData.addedLastMonth)} entries added last month`,
                            value: formatNumber(apiData.addedComparedToLastMonth, { signDisplay: "exceptZero" }),
                        },
                    ]}
                />
            </section>

            <section className="pt-6" aria-label="New list entries by media type">
                <StatsSectionHeader
                    index="01"
                    title="New list entries"
                    description="Entries added this month, with the change compared to last month for each media type."
                />
                <div className="rounded-xl border p-5 shadow-xs sm:p-6">
                    <CompactStatsGrid
                        columns={6}
                        items={apiData.addedPerMediaType.map(({ mediaType, thisMonth, comparedToLastMonth }) => ({
                            label: capitalize(mediaType),
                            value: formatNumber(thisMonth),
                            icon: <MainThemeIcon type={mediaType} size={16}/>,
                            note: `${formatNumber(comparedToLastMonth, { signDisplay: "exceptZero" })} vs. last month`,
                        }))}
                    />
                </div>
            </section>

            <section className="pt-10" aria-label="Updated media by media type">
                <StatsSectionHeader
                    index="02"
                    title="Updated media"
                    description="Distinct titles updated in users’ lists this month. Each title counts once per media type,
                    even when several users update it."
                />
                <div className="rounded-xl border p-5 shadow-xs sm:p-6">
                    <CompactStatsGrid
                        columns={6}
                        items={apiData.updatedPerMediaType.map(({ mediaType, thisMonth }) => ({
                            label: capitalize(mediaType),
                            value: formatNumber(thisMonth),
                            icon: <MainThemeIcon type={mediaType} size={16}/>,
                        }))}
                    />
                </div>
            </section>
        </DashboardShell>
    );
}
