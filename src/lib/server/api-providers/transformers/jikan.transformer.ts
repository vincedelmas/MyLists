import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {JikanDetails, JikanMangaSearchResponse, ProviderSearchResult, SearchData} from "@/lib/types/provider.types";


const transformSearchResults = (searchData: SearchData<JikanMangaSearchResponse>) => {
    const results = searchData.rawData?.data ?? [];
    const hasNextPage = searchData.rawData?.pagination?.has_next_page ?? false;

    const transformedResults = results.map((item): ProviderSearchResult => {
        return {
            id: item.mal_id,
            itemType: MediaType.MANGA,
            date: item.published?.from,
            name: item.title_english ?? item.title,
            image: item.images?.jpg?.image_url ?? getImageUrl("manga-covers"),
        };
    });

    return { data: transformedResults, hasNextPage };
};


const transformMangaDetailsResults = async (rawData: JikanDetails) => {
    const mediaData = {
        siteUrl: rawData.url,
        apiId: rawData.mal_id,
        volumes: rawData.volumes,
        chapters: rawData.chapters,
        synopsis: rawData.synopsis,
        prodStatus: rawData.status,
        voteAverage: rawData.score,
        originalName: rawData.title,
        voteCount: rawData.scored_by,
        popularity: rawData.popularity,
        name: rawData.title_english ?? rawData.title,
        endDate: formatDateForDb(rawData.published.to),
        releaseDate: formatDateForDb(rawData.published.from),
        publishers: rawData.serializations?.[0]?.name ?? null,
        imageCover: await saveImageFromUrl({
            dirSaveName: "manga-covers",
            imageUrl: rawData.images.jpg.large_image_url,
        }),
    }

    const genresData = rawData?.genres.map((genre) => ({ name: genre.name }));
    const authorsData = (rawData?.authors ?? [])
        .slice(0, 2)
        .map((author) => {
            const [last, first] = author.name?.split(",", 2) ?? [""];
            return first ? `${first.trim()} ${last.trim()}` : last;
        })
        .filter((name) => name.trim())
        .map((name) => ({ name }));

    return { mediaData, authorsData, genresData };
};


export const jikanTransformer = {
    transformSearchResults,
    transformDetailsResults: transformMangaDetailsResults,
}
