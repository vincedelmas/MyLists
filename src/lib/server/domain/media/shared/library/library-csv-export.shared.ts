import {catalogItem, libraryEntry} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {mediaTypeToApiProvider} from "@/lib/utils/media-mapping";
import {MYLISTS_CSV_VERSION} from "@/lib/server/domain/imports/parsers/mylists.parser";


export const libraryCsvBaseSelection = {
    status: libraryEntry.status,
    rating: libraryEntry.rating,
    mediaName: catalogItem.name,
    comment: libraryEntry.comment,
    favorite: libraryEntry.favorite,
    releaseDate: catalogItem.releaseDate,
    externalApiId: catalogItem.primaryExternalId,
};


export const libraryCsvMetadata = (kind: MediaType) => ({
    mediaType: kind,
    formatVersion: MYLISTS_CSV_VERSION,
    externalApiSource: mediaTypeToApiProvider(kind),
});
