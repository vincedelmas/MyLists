import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {YearRecapReleaseMode} from "@/lib/types/year-recap.types";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {adminYearRecapReleasesOptions} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminUpdateYearRecapReleaseMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


export const Route = createFileRoute("/_admin/admin/year-recaps")({
    context: () => ({
        yearRecapReleasesQueryOptions: adminYearRecapReleasesOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.yearRecapReleasesQueryOptions);
    },
    component: YearRecapsAdminPage,
});


const releaseModes: { value: YearRecapReleaseMode; label: string }[] = [
    { value: "automatic", label: "Automatic" },
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
];


function YearRecapsAdminPage() {
    const mutation = useAdminUpdateYearRecapReleaseMutation();
    const { yearRecapReleasesQueryOptions } = Route.useRouteContext();
    const releases = useSuspenseQuery(yearRecapReleasesQueryOptions).data;

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Year Recaps"
                description="Release or temporarily disable each annual recap. New years open automatically on December 20."
            />

            <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[90px_130px_minmax(420px,1fr)] gap-4 border-b bg-muted/40 px-5 py-3
                text-xs font-semibold uppercase tracking-wide text-muted-foreground max-md:hidden">
                    <span>Year</span>
                    <span>Status</span>
                    <span>Release mode</span>
                </div>
                {releases.map((release) =>
                    <div
                        key={release.year}
                        className="grid grid-cols-[90px_130px_minmax(420px,1fr)] items-center gap-4 border-b px-5 py-4
                        last:border-b-0 max-md:grid-cols-1 max-md:gap-3"
                    >
                        <div className="text-xl font-bold tabular-nums">
                            {release.year}
                        </div>
                        <Badge variant={release.isAvailable ? "success" : "secondary"}>
                            {release.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                        <RadioGroup
                            value={release.mode}
                            disabled={mutation.isPending}
                            aria-label={`${release.year} recap release mode`}
                            onValueChange={(mode) => mutation.mutate({
                                data: { year: release.year, mode: mode as YearRecapReleaseMode },
                            })}
                            className="flex flex-wrap gap-2"
                        >
                            {releaseModes.map((mode) =>
                                <label
                                    key={mode.value}
                                    htmlFor={`recap-${release.year}-${mode.value}`}
                                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm
                                    has-data-checked:border-brand/50 has-data-checked:bg-brand/5"
                                >
                                    <RadioGroupItem
                                        id={`recap-${release.year}-${mode.value}`}
                                        value={mode.value}
                                    />
                                    {mode.label}
                                </label>
                            )}
                        </RadioGroup>
                    </div>
                )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
                Automatic mode releases a recap at 00:00 UTC on December 20 of that year. Disabled overrides the schedule,
                including for completed years.
            </p>
        </DashboardShell>
    );
}
