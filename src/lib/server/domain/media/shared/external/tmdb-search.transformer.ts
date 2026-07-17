import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {isLatin1} from "@/lib/utils/text-formatting";
import {
    ProviderSearchResult,
    SearchData,
    TmdbMovieSearchResult,
    TmdbMultiSearchResponse,
    TmdbTvSearchResult,
} from "@/lib/types/provider.types";


const imageBaseUrl = "https://image.tmdb.org/t/p/w300";


export const transformTmdbSearchResults = (searchData: SearchData<TmdbMultiSearchResponse>) => {
    const results = searchData?.rawData?.results ?? [];
    const hasNextPage = searchData?.rawData?.total_pages > searchData.page;
    const mediaResults = results.filter((item) => item.media_type === "tv" || item.media_type === "movie");

    const data = mediaResults.map((item) => {
        const baseInfo = {
            id: item.id,
            image: item.poster_path ? `${imageBaseUrl}${item.poster_path}` : getImageUrl("movies-covers"),
        };
        const details = item.media_type === "tv"
            ? transformTvSearchItem(item)
            : transformMovieSearchItem(item);

        return { ...baseInfo, ...details } as ProviderSearchResult;
    });

    return { hasNextPage, data };
};


const transformTvSearchItem = (item: TmdbTvSearchResult) => {
    const isJapanese = item.original_language === "ja"
        || (Array.isArray(item.origin_country) ? item.origin_country.includes("JP") : item.origin_country === "JP");
    const isAnimation = item.genre_ids?.includes(16) ?? false;

    return {
        date: item.first_air_date,
        name: isLatin1(item.original_name) ? item.original_name : item.name,
        itemType: isJapanese && isAnimation ? MediaType.ANIME : MediaType.SERIES,
    };
};


const transformMovieSearchItem = (item: TmdbMovieSearchResult) => ({
    date: item.release_date,
    itemType: MediaType.MOVIES,
    name: isLatin1(item.original_title) ? item.original_title : item.title,
});
