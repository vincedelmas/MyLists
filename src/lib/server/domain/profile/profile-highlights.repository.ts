import {and, asc, eq, inArray, like} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {getImageUrl} from "@/lib/utils/image-url";
import {
    catalogItem,
    libraryEntry,
    profileMediaChannel,
} from "@/lib/server/database/schema";


export class ProfileHighlightsRepository {
    static async getActiveMediaTypes(userId: number) {
        return getDbClient().select({ mediaType: profileMediaChannel.kind })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.enabled, true)))
            .then((rows) => rows.map(({ mediaType }) => mediaType));
    }

    static async getUserFavorites(userId: number, mediaType: MediaType, limit = 7) {
        const rows = await getDbClient().select({
            mediaCover: catalogItem.imageCover,
            customCover: libraryEntry.customCover,
            mediaId: catalogItem.id,
            mediaName: catalogItem.name,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, mediaType),
                eq(libraryEntry.favorite, true),
            ))
            .limit(limit);
        return rows.map((row) => withCoverUrls(mediaType, row));
    }

    static async getMediaDetailsByIds(userId: number, mediaType: MediaType, mediaIds: number[]) {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];
        const rows = await getDbClient().select({
            id: catalogItem.id,
            name: catalogItem.name,
            imageCover: catalogItem.imageCover,
            customCover: libraryEntry.customCover,
        }).from(catalogItem)
            .leftJoin(libraryEntry, and(
                eq(libraryEntry.catalogItemId, catalogItem.id),
                eq(libraryEntry.userId, userId),
            ))
            .where(and(
                eq(catalogItem.kind, mediaType),
                inArray(catalogItem.id, uniqueIds),
            ));
        return rows.map((row) => ({
            ...row,
            imageCover: getImageUrl(`${mediaType}-covers`, row.imageCover),
            customCover: row.customCover ? getImageUrl(`${mediaType}-covers`, row.customCover) : null,
        }));
    }

    static async searchUserListByName(userId: number, mediaType: MediaType, query: string, limit = 10) {
        const rows = await getDbClient().selectDistinct({
            mediaCover: catalogItem.imageCover,
            mediaId: catalogItem.id,
            mediaName: catalogItem.name,
            customCover: libraryEntry.customCover,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, mediaType),
                like(catalogItem.name, `%${query}%`),
            ))
            .orderBy(asc(catalogItem.name))
            .limit(limit);
        return rows.map((row) => withCoverUrls(mediaType, row));
    }
}


const withCoverUrls = <T extends { mediaCover: string; customCover: string | null }>(mediaType: MediaType, row: T) => ({
    ...row,
    mediaCover: getImageUrl(`${mediaType}-covers`, row.mediaCover),
    customCover: row.customCover ? getImageUrl(`${mediaType}-covers`, row.customCover) : null,
});
