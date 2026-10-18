import {CalendarRange} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminYearRecapReleasesOptions} from "@/lib/client/react-query/query-options/admin.options";
import {YearRecapReleaseCard} from "@/lib/client/components/admin/year-recaps/YearRecapReleaseCard";


export const Route = createFileRoute("/_admin/admin/year-recaps")({
    context: () => ({
        yearRecapReleasesQueryOptions: adminYearRecapReleasesOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.yearRecapReleasesQueryOptions, staleTime: "static" });
    },
    component: YearRecapsAdminPage,
});


function YearRecapsAdminPage() {
    const { yearRecapReleasesQueryOptions } = Route.useRouteContext();
    const releases = useSuspenseQuery(yearRecapReleasesQueryOptions).data;
    const availableCount = releases.filter(release => release.isAvailable).length;

    return (
        <DashboardShell>
            <PageHeader
                title="Year recaps"
                eyebrow="Administration"
                eyebrowIcon={CalendarRange}
                asideLabel="Available recaps"
                asideValue={`${formatNumber(availableCount)} / ${formatNumber(releases.length)}`}
                description="Manage annual recap availability. Each year opens automatically on December 20 at 00:00 UTC."
            />
            <section className="my-6 flex min-w-0 flex-col gap-4" aria-label="Recap releases">
                {releases.length > 0 ?
                    releases.map(release =>
                        <YearRecapReleaseCard
                            release={release}
                            key={release.year}
                        />
                    )
                    :
                    <EmptyState
                        className="py-8"
                        icon={CalendarRange}
                        message="No year recaps to configure yet."
                    />
                }
            </section>
        </DashboardShell>
    );
}
