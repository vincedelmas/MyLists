import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {compareDateInputs} from "@/lib/utils/date-formatting";
import {TrendGrid} from "@/lib/client/components/trends/TrendGrid";
import {TrendHero} from "@/lib/client/components/trends/TrendHero";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {trendsOptions} from "@/lib/client/react-query/query-options";
import {TREND_MEDIA_TYPES, TrendsActiveTab, trendsSearchSchema} from "@/lib/schemas";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";


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
    const mediaTabs = createMediaTabItems(TREND_MEDIA_TYPES, { leading: "all" });
    const { gamesTrends, seriesTrends, moviesTrends } = useSuspenseQuery(trendsOptions).data;

    const setActiveTab = (newTab: TrendsActiveTab) => {
        void navigate({ search: (prev) => ({ ...prev, activeTab: newTab === "all" ? undefined : newTab }) });
    };

    const allTrends = [...seriesTrends, ...moviesTrends, ...gamesTrends]
        .sort((a, b) => compareDateInputs(b.releaseDate, a.releaseDate));

    const getFilteredData = () => {
        if (activeTab === MediaType.MOVIES) return moviesTrends;
        if (activeTab === MediaType.SERIES) return seriesTrends;
        if (activeTab === MediaType.GAMES) return gamesTrends;
        return allTrends;
    };

    const getHeroMedia = () => {
        if (activeTab === MediaType.SERIES) return seriesTrends[0];
        if (activeTab === MediaType.GAMES) return gamesTrends[0];
        return moviesTrends[0];
    }

    const heroMedia = getHeroMedia();
    const filteredTrends = getFilteredData();

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
