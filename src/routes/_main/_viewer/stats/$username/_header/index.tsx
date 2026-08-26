import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {StatsActiveTab, statsActiveTabSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {YearRecapReleaseStatus} from "@/lib/types/year-recap.types";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {YearRecapDashboard} from "@/lib/client/components/year-recap/YearRecapDashboard";
import {userStatsOptions, yearRecapOptions, yearRecapReleasesOptions} from "@/lib/client/react-query/query-options";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header/")({
    validateSearch: statsActiveTabSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        const releases = await queryClient.ensureQueryData(yearRecapReleasesOptions);

        if (search.recap) {
            if (!releases.some(({ year, isAvailable }) => year === search.recap && isAvailable)) {
                throw redirect({
                    params: { username },
                    to: "/stats/$username",
                    search: { activeTab: search.activeTab, recap: undefined },
                });
            }

            const recap = await queryClient.ensureQueryData(yearRecapOptions(
                username,
                search.recap,
                search.activeTab === "overview" ? undefined : search.activeTab,
            ));

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
            await queryClient.ensureQueryData(userStatsOptions(username, search.activeTab));
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

    return (
        view === "recap"
            ? <RecapStatsPage releases={releases}/>
            : <AllTimeStatsPage releases={releases}/>
    );
}


function AllTimeStatsPage({ releases }: { releases: YearRecapReleaseStatus[] }) {
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();
    const { activeTab } = Route.useSearch();

    const apiData = useSuspenseQuery(userStatsOptions(username, activeTab)).data;
    const mediaTabs = createMediaTabItems(apiData.activatedMediaTypes, { leading: "overview" }) as TabItem<StatsActiveTab>[];

    return (
        <PageTitle title={`${username} Stats`} onlyHelmet>
            <StatsNavigation
                releases={releases}
                mediaTabs={mediaTabs}
            />

            <div className="mt-6">
                <DashboardContent
                    data={apiData}
                    subjectName={username}
                    onSelectMediaType={(val) => void navigate({ search: (prev) => ({ ...prev, activeTab: val }) })}
                />
            </div>
        </PageTitle>
    );
}


function RecapStatsPage({ releases }: { releases: YearRecapReleaseStatus[] }) {
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const { activeTab, recap: year } = Route.useSearch();
    const recap = useSuspenseQuery(yearRecapOptions(username, year!, activeTab === "overview" ? undefined : activeTab)).data;
    const mediaTabs = createMediaTabItems(recap.availableMediaTypes, { leading: "overview" }) as TabItem<StatsActiveTab>[];

    return (
        <PageTitle title={`${username} Recap ${year}`} onlyHelmet>
            <StatsNavigation
                releases={releases}
                mediaTabs={mediaTabs}
            />
            <div className="mt-6">
                <YearRecapDashboard
                    recap={recap}
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

    const handleTabChange = async (val: StatsActiveTab) => {
        await navigate({ search: (prev) => ({ ...prev, activeTab: val }) });
    };

    return (
        <>
            <TabHeader tabs={mediaTabs} activeTab={activeTab} setActiveTab={handleTabChange}>
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
            </TabHeader>
        </>
    );
}
