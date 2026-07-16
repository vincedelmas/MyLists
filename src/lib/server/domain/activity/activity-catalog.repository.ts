import {and, eq, inArray, like, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, movieDetails, tvDetails} from "@/lib/server/database/schema";
import {getImageUrl} from "@/lib/utils/image-url";
import {MediaType} from "@/lib/utils/enums";


/** Catalog projections used by the cross-media activity UI. */
export class ActivityCatalogRepository {
    static async getMediaDetailsByIds(mediaType: MediaType, mediaIds: number[]) {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];

        const rows = await getDbClient().select({
            id: catalogItem.id,
            name: catalogItem.name,
            imageCover: catalogItem.imageCover,
            releaseDate: catalogItem.releaseDate,
            duration: sql<number | null>`CASE
                WHEN ${catalogItem.kind} IN ('series', 'anime') THEN ${tvDetails.episodeDurationMinutes}
                WHEN ${catalogItem.kind} = 'movies' THEN ${movieDetails.durationMinutes}
                ELSE NULL
            END`,
        }).from(catalogItem)
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, mediaType),
                inArray(catalogItem.id, uniqueIds),
            ));

        return rows.map((row) => ({
            ...row,
            duration: row.duration ?? undefined,
            releaseDate: row.releaseDate ?? "",
            imageCover: getImageUrl(`${mediaType}-covers`, row.imageCover),
            customCover: null,
        }));
    }

    static async getMediaDurationsByIds(mediaType: MediaType, mediaIds: number[]) {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];

        return getDbClient().select({
            id: catalogItem.id,
            duration: sql<number | null>`CASE
                WHEN ${catalogItem.kind} IN ('series', 'anime') THEN ${tvDetails.episodeDurationMinutes}
                WHEN ${catalogItem.kind} = 'movies' THEN ${movieDetails.durationMinutes}
                ELSE NULL
            END`,
        }).from(catalogItem)
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, mediaType),
                inArray(catalogItem.id, uniqueIds),
            ));
    }

    static async searchUserListByName(userId: number, mediaType: MediaType, query: string, limit: number) {
        return getDbClient().select({ mediaId: catalogItem.id })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, mediaType),
                like(catalogItem.name, `%${query}%`),
            ))
            .orderBy(catalogItem.name)
            .limit(limit);
    }
}
