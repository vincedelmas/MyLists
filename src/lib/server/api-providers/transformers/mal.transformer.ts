import {MediaType} from "@/lib/utils/enums";
import {uniqueBy} from "@/lib/utils/arrays";
import {getImageUrl} from "@/lib/utils/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {MalMangaDetails, MalMangaSearchResponse, ProviderSearchResult, SearchData} from "@/lib/types/provider.types";


type MalTransformOptions = {
    maxAuthors: number;
    coverDirectory: CoverType;
    mediaType: typeof MediaType.MANGA;
};


const MANGA_STATUS_LABELS: Record<string, string> = {
    finished: "Finished",
    currently_publishing: "Publishing",
    not_yet_published: "Not Yet Published",
};


const transformSearchResults = (searchData: SearchData<MalMangaSearchResponse>, options: MalTransformOptions) => {
    const results = searchData.rawData?.data ?? [];
    const hasNextPage = Boolean(searchData.rawData?.paging?.next);

    const transformedResults = results.map(({ node: item }): ProviderSearchResult => {
        return {
            id: item.id,
            date: item.start_date,
            itemType: options.mediaType,
            name: item.alternative_titles?.en?.trim() || item.title,
            image: item.main_picture?.medium ?? getImageUrl(options.coverDirectory),
        };
    });

    return { data: transformedResults, hasNextPage };
};


const transformMangaDetailsResults = async (rawData: MalMangaDetails, options: MalTransformOptions) => {
    const mediaData = {
        apiId: rawData.id,
        synopsis: rawData.synopsis,
        originalName: rawData.title,
        popularity: rawData.popularity,
        voteAverage: rawData.mean ?? null,
        volumes: rawData.num_volumes || null,
        voteCount: rawData.num_scoring_users,
        chapters: rawData.num_chapters || null,
        endDate: formatDateForDb(rawData.end_date),
        releaseDate: formatDateForDb(rawData.start_date),
        siteUrl: `https://myanimelist.net/manga/${rawData.id}`,
        publishers: rawData.serialization?.[0]?.node?.name ?? null,
        name: rawData.alternative_titles?.en?.trim() || rawData.title,
        prodStatus: MANGA_STATUS_LABELS[rawData.status] ?? rawData.status,
        imageCover: await saveImageFromUrl({
            dirSaveName: options.coverDirectory,
            imageUrl: rawData.main_picture?.large ?? rawData.main_picture?.medium,
        }),
    }

    const genres = rawData?.genres.map((genre) => ({ name: genre.name }));
    const genresData = genres ? uniqueBy(genres, (genre) => genre.name) : undefined;

    const authorsData = uniqueBy((rawData?.authors ?? [])
        .map((author) => {
            return [author.node.first_name, author.node.last_name]
                .map((name) => name?.trim())
                .filter(Boolean)
                .join(" ");
        })
        .filter((name) => name.trim())
        .map((name) => ({ name })), (author) => author.name, options.maxAuthors);

    return { mediaData, authorsData, genresData };
};


export const malTransformer = {
    transformSearchResults,
    transformDetailsResults: transformMangaDetailsResults,
}
