import {normalizeIsbn} from "@/lib/server/domain/media/books/book-matching";
import {MediaType} from "@/lib/utils/enums";
import {uniqueBy} from "@/lib/utils/arrays-objects";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {formatHtmlText} from "@/lib/utils/formatting/text";
import {formatDateForDb} from "@/lib/utils/formatting/date";
import {GBooksDetails, GBooksSearchResults, ProviderSearchResult, SearchData} from "@/lib/types/provider.types";


type GBooksTransformOptions = {
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
    const editionData = {
        apiId: rawData.id,
        language: rawData.volumeInfo.language,
        publishers: rawData.volumeInfo.publisher,
        name: [rawData.volumeInfo.title ?? "No Title Found", rawData.volumeInfo.subtitle].filter(Boolean).join(": "),
        pages: rawData.volumeInfo.pageCount && rawData.volumeInfo.pageCount > 0 ? rawData.volumeInfo.pageCount : null,
        isbns: [...new Set((rawData.volumeInfo.industryIdentifiers ?? [])
            .filter(id => id.type === "ISBN_10" || id.type === "ISBN_13")
            .map(id => normalizeIsbn(id.identifier)).filter((isbn): isbn is string => isbn !== null))],
        authors: rawData.volumeInfo.authors ?? [],
        releaseDate: formatDateForDb(rawData.volumeInfo.publishedDate),
        imageCover: await saveImageFromUrl({
            dirSaveName: options.coverDirectory,
            imageUrl: rawData.volumeInfo.imageLinks?.extraLarge ??
                rawData.volumeInfo.imageLinks?.large ?? rawData.volumeInfo.imageLinks?.medium ?? rawData.volumeInfo.imageLinks?.thumbnail,
        }),
    }

    const authors = rawData.volumeInfo?.authors?.map((name) => ({ name }));
    const authorsData = authors
        ? uniqueBy(authors, (author) => author.name)
        : undefined;

    return {
        mediaData: {
            apiId: editionData.apiId,
            name: rawData.volumeInfo.title ?? "No Title Found",
            imageCover: editionData.imageCover,
            releaseDate: null,
            synopsis: formatHtmlText(rawData.volumeInfo.description ?? "No Description Found"),
        },
        editionData,
        authorsData,
    };
};


export const gBooksTransformer = {
    transformSearchResults,
    transformDetailsResults: transformBooksDetailsResults,
}
