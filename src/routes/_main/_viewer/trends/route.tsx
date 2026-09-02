import {MediaType} from "@/lib/utils/enums";
import {Flame, TrendingUp} from "lucide-react";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/number-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {compareDateInputs} from "@/lib/utils/date-formatting";
import {TrendGrid} from "@/lib/client/components/trends/TrendGrid";
import {TrendHero} from "@/lib/client/components/trends/TrendHero";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {trendsOptions} from "@/lib/client/react-query/query-options";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {TREND_MEDIA_TYPES, trendsSearchSchema} from "@/lib/schemas";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";


export const Route = createFileRoute("/_main/_viewer/trends")({
    validateSearch: trendsSearchSchema,
    context: () => ({
        trendsQueryOptions: trendsOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.trendsQueryOptions);
    },
    component: TrendsPage,
});


function TrendsPage() {
    const { activeTab } = Route.useSearch();
    const { trendsQueryOptions } = Route.useRouteContext();
    const mediaTabs = createMediaTabItems(TREND_MEDIA_TYPES, { leading: "all" });
    const { gamesTrends, seriesTrends, moviesTrends } = useSuspenseQuery(trendsQueryOptions).data;

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
    };

    const heroMedia = getHeroMedia();
    const filteredTrends = getFilteredData();

    return (
        <PageTitle title="Weekly trends" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    eyebrowIcon={Flame}
                    title="Weekly trends"
                    asideIcon={TrendingUp}
                    eyebrow="Popular this week"
                    asideLabel="On this page"
                    description="The movies, series and games drawing the most attention this week."
                    asideValue={<>{formatNumber(filteredTrends.length)} {filteredTrends.length === 1 ? "title" : "titles"}</>}
                    navigation={
                        <TabHeader
                            tabs={mediaTabs}
                            value={activeTab}
                            triggerClassName="max-sm:px-3"
                            renderTrigger={(tab, props) =>
                                <Link
                                    {...props}
                                    to="/trends"
                                    resetScroll={false}
                                    search={{ activeTab: tab.id === "all" ? undefined : tab.id }}
                                />
                            }
                        />
                    }
                />

                <div>
                    <TrendHero
                        trend={heroMedia}
                    />

                    <TrendGrid
                        data={filteredTrends}
                    />
                </div>
            </div>
        </PageTitle>
    );
}
