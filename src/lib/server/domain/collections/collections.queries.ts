import {sql} from "drizzle-orm";
import type {MediaType} from "@/lib/utils/enums";
import {collectionItems, collections} from "@/lib/server/database/schema";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";


export const getCollectionMediaTypesSelection = () => sql<MediaType[]>`(
    SELECT json_group_array(DISTINCT ${collectionItems.mediaType})
    FROM ${collectionItems}
    WHERE ${collectionItems.collectionId} = ${collections.id}
)`.mapWith((value: string) => {
    const mediaTypes: MediaType[] = JSON.parse(value);
    return ALL_MEDIA_TYPES.filter(mediaType => mediaTypes.includes(mediaType));
});


export const collectionContainsMediaType = (mediaType: MediaType) => sql`EXISTS (
    SELECT 1
    FROM ${collectionItems}
    WHERE ${collectionItems.collectionId} = ${collections.id}
        AND ${collectionItems.mediaType} = ${mediaType}
)`;
