import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatHours} from "@/lib/utils/number-formatting";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {StatsActiveTab, statsActiveTabSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {YearRecapReleaseStatus} from "@/lib/types/year-recap.types";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {createFileRoute, Link, redirect} from "@tanstack/react-router";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {CalendarRange, ChartNoAxesColumnIncreasing, Clock3} from "lucide-react";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {YearRecapDashboard} from "@/lib/client/components/year-recap/YearRecapDashboard";
import {userStatsOptions, yearRecapOptions, yearRecapReleasesOptions} from "@/lib/client/react-query/query-options";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header/")({
    validateSearch: statsActiveTabSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { username }, deps: { search } }) => ({
        yearRecapReleasesQueryOptions: yearRecapReleasesOptions,
        userStatsQueryOptions: search.recap
            ? undefined
            : userStatsOptions(username, search.activeTab),
        yearRecapQueryOptions: search.recap
            ? yearRecapOptions(username, search.recap, search.activeTab === "overview" ? undefined : search.activeTab)
            : undefined,
    }),
    loader: async ({ context, params: { username }, deps: { search } }) => {
        const releases = await context.queryClient.ensureQueryData(context.yearRecapReleasesQueryOptions);

        if (search.recap) {
            if (!releases.some(({ year, isAvailable }) => year === search.recap && isAvailable)) {
                throw redirect({
                    params: { username },
                    to: "/stats/$username",
                    search: { activeTab: search.activeTab, recap: undefined },
                });
            }

            const recap = await context.queryClient.ensureQueryData(context.yearRecapQueryOptions!);

            if (search.activeTab !== "overview" && !recap.availableMediaTypes.includes(search.activeTab)) {
                throw redirect({
                    params: { username },
                    to: "/stats/$username",
                    search: { activeTab: "overview", recap: search.recap },
                });
            }

            return { view: "recap" as const, releases };
        }

        try {
            await context.queryClient.ensureQueryData(context.userStatsQueryOptions!);
        }
        catch (error) {
            if (search.activeTab !== "overview" && error instanceof InactiveMediaTypeError) {
                throw redirect({
                    params: { username },
                    to: "/stats/$username",
                    search: { activeTab: "overview", recap: undefined },
                });
            }

            throw error;
        }
        return { view: "all-time" as const, releases };
    },
    component: UserStatsPage,
});


function UserStatsPage() {
    const { view, releases } = Route.useLoaderData();
    const { userStatsQueryOptions, yearRecapQueryOptions } = Route.useRouteContext();

    return (
        view === "recap"
            ? <RecapStatsPage releases={releases} queryOptions={yearRecapQueryOptions!}/>
            : <AllTimeStatsPage releases={releases} queryOptions={userStatsQueryOptions!}/>
    );
}


function AllTimeStatsPage({ releases, queryOptions }: {
    releases: YearRecapReleaseStatus[],
    queryOptions: ReturnType<typeof userStatsOptions>,
}) {
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();

    const apiData = useSuspenseQuery(queryOptions).data;
    const mediaTabs = createMediaTabItems(apiData.activatedMediaTypes, { leading: "overview" }) as TabItem<StatsActiveTab>[];
    const isOverview = apiData.kind === "overview";
    const trackedHours = isOverview ? apiData.totalHours : apiData.timeSpentHours;

    return (
        <PageTitle title={`${username} Stats`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={Clock3}
                    eyebrow="At a glance"
                    title={`${username}'s stats`}
                    asideValue={formatHours(trackedHours)}
                    eyebrowIcon={ChartNoAxesColumnIncreasing}
                    description={`A look at what ${username} has tracked, rated and enjoyed.`}
                    asideLabel={
                        <span className="flex items-center gap-1.5">
                            {isOverview
                                ? "Total time tracked"
                                : `${capitalize(apiData.mediaType)} time tracked`
                            }
                            <InfoPopover label="Statistics cache information">
                                Statistics are cached for 1h, so recent changes may take time to appear.
                            </InfoPopover>
                        </span>
                    }
                    navigation={
                        <StatsNavigation
                            releases={releases}
                            mediaTabs={mediaTabs}
                        />
                    }
                />

                <DashboardContent
                    data={apiData}
                    showHero={false}
                    subjectName={username}
                    onSelectMediaType={(val) => void navigate({ search: (prev) => ({ ...prev, activeTab: val }) })}
                />
            </div>
        </PageTitle>
    );
}


function RecapStatsPage({ releases, queryOptions }: {
    releases: YearRecapReleaseStatus[],
    queryOptions: ReturnType<typeof yearRecapOptions>,
}) {
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const { recap: year } = Route.useSearch();
    const recap = useSuspenseQuery(queryOptions).data;
    const mediaTabs = createMediaTabItems(recap.availableMediaTypes, { leading: "overview" }) as TabItem<StatsActiveTab>[];

    return (
        <PageTitle title={`${username} Recap ${year}`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={Clock3}
                    eyebrow="Year in review"
                    eyebrowIcon={CalendarRange}
                    title={`${username}'s ${year} recap`}
                    asideValue={formatHours(recap.totals.hours)}
                    asideLabel={recap.scope === "all" ? "Time tracked this year" : `${capitalize(recap.scope)} time tracked`}
                    description={`A look back at what ${username} finished, revisited and added to My Activity.`}
                    navigation={
                        <StatsNavigation
                            releases={releases}
                            mediaTabs={mediaTabs}
                        />
                    }
                />

                <YearRecapDashboard
                    recap={recap}
                    showHero={false}
                    canGenerateImage={currentUser?.name.toLocaleLowerCase() === username.toLocaleLowerCase()}
                />
            </div>
        </PageTitle>
    );
}


interface StatsNavigationProps {
    releases: YearRecapReleaseStatus[];
    mediaTabs: TabItem<StatsActiveTab>[];
}


function StatsNavigation({ mediaTabs, releases }: StatsNavigationProps) {
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();
    const { activeTab, recap } = Route.useSearch();

    const periodItems = [
        { label: "All time", value: "all-time", disabled: false },
        ...releases.map((release) => ({
            label: `Recap ${release.year}`,
            value: release.year.toString(),
            disabled: !release.isAvailable,
        })),
    ];

    return (
        <>
            <TabHeader
                tabs={mediaTabs}
                value={activeTab}
                trailing={
                    <div className="flex items-center gap-3">
                        <Select
                            items={periodItems}
                            value={recap?.toString() ?? "all-time"}
                            onValueChange={(value) => {
                                if (value === null) return;
                                void navigate({
                                    search: { activeTab, recap: value === "all-time" ? undefined : Number(value) },
                                });
                            }}
                        >
                            <SelectTrigger size="sm" className="w-34 font-semibold">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectGroup>
                                    {periodItems.map((item) =>
                                        <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                                            {item.label}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <QuickActions
                            username={username}
                            mediaType={activeTab === "overview" ? undefined : activeTab as MediaType}
                        />
                    </div>
                }
                renderTrigger={(tab, props) =>
                    <Link
                        {...props}
                        resetScroll={false}
                        to="/stats/$username"
                        params={{ username }}
                        search={{ recap, activeTab: tab.id === "overview" ? undefined : tab.id }}
                    />
                }
            />
        </>
    );
}
