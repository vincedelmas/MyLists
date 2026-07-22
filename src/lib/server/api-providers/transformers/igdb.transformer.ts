import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {HltbGameEntry, IgdbGameDetails, IgdbSearchResponse, IgdbTrendGamesResponse, ProviderSearchResult, SearchData, TrendsMedia} from "@/lib/types/provider.types";


type IgdbTransformOptions = {
    maxGenres: number;
    coverDirectory: CoverType;
    mediaType: typeof MediaType.GAMES;
};


const imageBaseUrl = "https://images.igdb.com/igdb/image/upload/t_1080p/";


const transformSearchResults = (searchData: SearchData<IgdbSearchResponse>, options: IgdbTransformOptions) => {
    const results = searchData.rawData?.result ?? [];
    const hasNextPage = (searchData.rawData?.count ?? 0) > (searchData.page * searchData.resultsPerPage);

    const transformedResults = results.map((item): ProviderSearchResult => {
        return {
            id: item.id,
            name: item?.name,
            itemType: options.mediaType,
            date: item?.first_release_date,
            image: item?.cover?.image_id ? `${imageBaseUrl}${item?.cover?.image_id}.jpg` : getImageUrl(options.coverDirectory),
        };
    });

    return { data: transformedResults, hasNextPage };
};


const transformGamesDetailsResults = async (rawData: IgdbGameDetails, options: IgdbTransformOptions) => {
    const mediaData = {
        apiId: rawData.id,
        name: rawData?.name,
        igdbUrl: rawData?.url,
        synopsis: rawData?.summary,
        voteAverage: rawData?.total_rating ?? 0,
        voteCount: rawData?.total_rating_count ?? 0,
        gameEngine: rawData?.game_engines?.[0]?.name,
        collectionId: rawData?.collections?.[0] ?? null,
        releaseDate: formatDateForDb(rawData.first_release_date),
        playerPerspective: rawData?.player_perspectives?.[0]?.name,
        gameModes: rawData?.game_modes?.map((mode) => mode?.name).join(","),
        steamApiId: rawData.external_games?.find((source) => source.external_game_source === 1)?.uid,
        hltbMainTime: null,
        hltbMainAndExtraTime: null,
        hltbTotalCompleteTime: null,
        imageCover: await saveImageFromUrl({
            dirSaveName: options.coverDirectory,
            imageUrl: `${imageBaseUrl}${rawData?.cover?.image_id}.jpg`,
        }),
    }

    const part1GenreData = rawData?.genres?.map((genre) => ({ name: genre.name })) || [];
    const part2GenreData = rawData?.themes?.map((theme) => ({ name: theme.name })) || [];

    let genresData = [...part1GenreData, ...part2GenreData];
    const renameGenresMap: Record<string, string> = {
        "4X (explore, expand, exploit, and exterminate)": "4X",
        "Hack and slash/Beat 'em up": "Hack and Slash",
        "Card & Board Game": "Card Game",
        "Quiz/Trivia": "Quiz",
    }
    for (const genre of genresData) {
        if (renameGenresMap[genre.name]) {
            genre.name = renameGenresMap[genre.name];
        }
    }

    genresData = genresData.slice(0, options.maxGenres);
    const companiesData = rawData?.involved_companies?.filter(company => company.developer || company.publisher)
        .map(company => ({
            name: company.company.name,
            developer: company.developer,
            publisher: company.publisher,
        }));
    const platformsData = rawData?.platforms?.map((platform) => ({ name: platform.name }));

    return { mediaData, companiesData, platformsData, genresData };
};


const addHLTBDataToMainDetails = (hltbData: HltbGameEntry, mediaData: UpsertGameWithDetails["mediaData"]) => {
    const mainTime = Number(hltbData.mainStory);
    mediaData.hltbMainTime = isNaN(mainTime) ? null : mainTime;

    const mainExtraTime = Number(hltbData.mainExtra);
    mediaData.hltbMainAndExtraTime = isNaN(mainExtraTime) ? null : mainExtraTime;

    const completionistTime = Number(hltbData.completionist);
    mediaData.hltbTotalCompleteTime = isNaN(completionistTime) ? null : completionistTime;

    return mediaData;
};


const transformGamesTrends = (rawData: IgdbTrendGamesResponse[], options: IgdbTransformOptions): TrendsMedia[] => {
    return rawData.map((item) => ({
        apiId: item.game.id,
        displayName: item.game.name,
        mediaType: options.mediaType,
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
