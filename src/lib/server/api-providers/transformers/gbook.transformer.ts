import {MediaType} from "@/lib/utils/enums";
import {uniqueBy} from "@/lib/utils/arrays";
import {getImageUrl} from "@/lib/utils/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatHtmlText} from "@/lib/utils/text-formatting";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {GBooksDetails, GBooksSearchResults, ProviderSearchResult, SearchData} from "@/lib/types/provider.types";


type GBooksTransformOptions = {
    defaultPages: number;
    coverDirectory: CoverType;
    mediaType: typeof MediaType.BOOKS;
};


const transformSearchResults = (searchData: SearchData<GBooksSearchResults>, options: GBooksTransformOptions) => {
    const results = searchData.rawData?.items ?? [];
    const hasNextPage = searchData.rawData.totalItems > (searchData.page * searchData.resultsPerPage);

    const transformedResults = results.map((item): ProviderSearchResult => {
        return {
            id: item.id,
            itemType: options.mediaType,
            date: item.volumeInfo?.publishedDate,
            name: item.volumeInfo?.title ?? "No Title Found",
            image: item.volumeInfo?.imageLinks?.thumbnail ?? getImageUrl(options.coverDirectory),
        };
    });

    return { data: transformedResults, hasNextPage };
};


const transformBooksDetailsResults = async (rawData: GBooksDetails, options: GBooksTransformOptions) => {
    const mediaData = {
        apiId: rawData.id,
        language: rawData.volumeInfo.language,
        publishers: rawData.volumeInfo.publisher,
        name: rawData.volumeInfo.title ?? "No Title Found",
        pages: rawData.volumeInfo.pageCount ?? options.defaultPages,
        releaseDate: formatDateForDb(rawData.volumeInfo.publishedDate),
        synopsis: formatHtmlText(rawData.volumeInfo.description ?? "No Description Found"),
        imageCover: await saveImageFromUrl({
            dirSaveName: options.coverDirectory,
            imageUrl: rawData.volumeInfo.imageLinks?.extraLarge ??
                rawData.volumeInfo.imageLinks?.large ?? rawData.volumeInfo.imageLinks?.medium,
        }),
    }

    const authors = rawData.volumeInfo?.authors?.map((name) => ({ name }));
    const authorsData = authors
        ? uniqueBy(authors, (author) => author.name)
        : undefined;

    return { mediaData, authorsData };
};


export const gBooksTransformer = {
    transformSearchResults,
    transformDetailsResults: transformBooksDetailsResults,
}
