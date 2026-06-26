import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {compareDateInputs} from "@/lib/utils/date-formatting";
import {TrendsActiveTab, trendsSearchSchema} from "@/lib/schemas";
import {TrendGrid} from "@/lib/client/components/trends/TrendGrid";
import {TrendHero} from "@/lib/client/components/trends/TrendHero";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {trendsOptions} from "@/lib/client/react-query/query-options";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";


export const Route = createFileRoute("/_main/_viewer/trends")({
    validateSearch: trendsSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(trendsOptions);
    },
    component: TrendsPage,
});


function TrendsPage() {
    const navigate = Route.useNavigate();
    const { activeTab } = Route.useSearch();
    const { seriesTrends, moviesTrends, gamesTrends } = useSuspenseQuery(trendsOptions).data;

    const setActiveTab = (newTab: TrendsActiveTab) => {
        void navigate({ search: (prev) => ({ ...prev, activeTab: newTab === "all" ? undefined : newTab }) });
    };

    const allTrends = [...seriesTrends, ...moviesTrends, ...gamesTrends]
        .sort((a, b) => compareDateInputs(b.releaseDate, a.releaseDate));

    const getFilteredData = () => {
        if (activeTab === MediaType.GAMES) return gamesTrends;
        if (activeTab === MediaType.MOVIES) return moviesTrends;
        if (activeTab === MediaType.SERIES) return seriesTrends;
        return allTrends;
    };

    const getHeroMedia = () => {
        if (activeTab === MediaType.GAMES) return gamesTrends[0];
        if (activeTab === MediaType.SERIES) return seriesTrends[0];
        return moviesTrends[0];
    }

    const heroMedia = getHeroMedia();
    const filteredTrends = getFilteredData();

    const mediaTabs: TabItem<TrendsActiveTab>[] = [
        {
            id: "all",
            label: "All",
            isAccent: true,
            icon: <MainThemeIcon size={15} type="all"/>,
        },
        ...[MediaType.SERIES, MediaType.MOVIES, MediaType.GAMES].map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

    return (
        <PageTitle title="Week Trends" subtitle="Top Series, Movies and Games trending this week">
            <TabHeader
                tabs={mediaTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <div className="mt-4">
                <TrendHero trend={heroMedia}/>
                <TrendGrid data={filteredTrends}/>
            </div>
        </PageTitle>
    );
}
