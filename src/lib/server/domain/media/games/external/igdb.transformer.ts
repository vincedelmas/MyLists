import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {GameCatalogSnapshot} from "@/lib/server/domain/media/games/catalog/game-catalog-snapshot";
import {HltbGameEntry, IgdbGameDetails, IgdbSearchResponse, IgdbTrendGamesResponse, ProviderSearchResult, SearchData, TrendsMedia} from "@/lib/types/provider.types";


/** IGDB-specific normalization for the games media module. */
const maxGenres = 5;
const imageBaseUrl = "https://images.igdb.com/igdb/image/upload/t_1080p/";


const transformSearchResults = (searchData: SearchData<IgdbSearchResponse>) => {
    const results = searchData.rawData?.result ?? [];
    const hasNextPage = (searchData.rawData?.count ?? 0) > (searchData.page * searchData.resultsPerPage);

    const transformedResults = results.map((item): ProviderSearchResult => {
        return {
            id: item.id,
            name: item?.name,
            itemType: MediaType.GAMES,
            date: item?.first_release_date,
            image: item?.cover?.image_id ? `${imageBaseUrl}${item?.cover?.image_id}.jpg` : getImageUrl("games-covers"),
        };
    });

    return { data: transformedResults, hasNextPage };
};


const transformGamesDetailsResults = async (rawData: IgdbGameDetails) => {
    const rawGenres = [
        ...(rawData?.genres?.map((genre) => genre.name) ?? []),
        ...(rawData?.themes?.map((theme) => theme.name) ?? []),
    ];
    const renameGenresMap: Record<string, string> = {
        "4X (explore, expand, exploit, and exterminate)": "4X",
        "Hack and slash/Beat 'em up": "Hack and Slash",
        "Card & Board Game": "Card Game",
        "Quiz/Trivia": "Quiz",
    };

    return {
        apiId: rawData.id,
        name: rawData?.name,
        igdbUrl: rawData?.url,
        synopsis: rawData?.summary,
        voteAverage: rawData?.total_rating ?? 0,
        voteCount: rawData?.total_rating_count ?? 0,
        gameEngine: rawData?.game_engines?.[0]?.name,
        collectionExternalId: rawData?.collections?.[0] ?? null,
        releaseDate: formatDateForDb(rawData.first_release_date),
        playerPerspective: rawData?.player_perspectives?.[0]?.name,
        gameModes: rawData?.game_modes?.map((mode) => mode?.name).join(","),
        steamAppId: rawData.external_games?.find((source) => source.external_game_source === 1)?.uid,
        hltbMainHours: null,
        hltbMainExtraHours: null,
        hltbCompletionistHours: null,
        imageCover: await saveImageFromUrl({
            dirSaveName: "games-covers",
            imageUrl: `${imageBaseUrl}${rawData?.cover?.image_id}.jpg`,
        }),
        genres: rawGenres.map((genre) => renameGenresMap[genre] ?? genre).slice(0, maxGenres),
        companies: rawData?.involved_companies?.filter(company => company.developer || company.publisher)
            .map(company => ({
            name: company.company.name,
            developer: company.developer,
            publisher: company.publisher,
            })),
        platforms: rawData?.platforms?.map((platform) => platform.name),
    };
};


const addHLTBDataToMainDetails = (hltbData: HltbGameEntry, snapshot: GameCatalogSnapshot) => {
    const mainTime = Number(hltbData.mainStory);
    snapshot.hltbMainHours = isNaN(mainTime) ? null : mainTime;

    const mainExtraTime = Number(hltbData.mainExtra);
    snapshot.hltbMainExtraHours = isNaN(mainExtraTime) ? null : mainExtraTime;

    const completionistTime = Number(hltbData.completionist);
    snapshot.hltbCompletionistHours = isNaN(completionistTime) ? null : completionistTime;

    return snapshot;
};


const transformGamesTrends = (rawData: IgdbTrendGamesResponse[]): TrendsMedia[] => {
    return rawData.map((item) => ({
        apiId: item.game.id,
        displayName: item.game.name,
        mediaType: MediaType.GAMES,
        overview: item.game.summary ?? "",
        releaseDate: item.game.first_release_date,
        posterPath: item.game.cover?.image_id ? `${imageBaseUrl}${item.game.cover.image_id}.jpg` : "",
    }));
};


export const igdbTransformer = {
    transformGamesTrends,
    transformSearchResults,
    addHLTBDataToMainDetails,
    transformDetailsResults: transformGamesDetailsResults,
};
