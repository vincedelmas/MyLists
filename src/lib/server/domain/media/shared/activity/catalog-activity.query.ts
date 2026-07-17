import {and, eq, inArray, like} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry} from "@/lib/server/database/schema";


export type ActivityMediaDuration = { id: number; duration: number | null };

export interface ActivityDurationSource {
    getByIds(mediaIds: number[]): Promise<ActivityMediaDuration[]>;
}


/** Reusable activity projection bound to one media module. */
export class CatalogActivityQuery {
    constructor(
        private readonly kind: MediaType,
        private readonly durations?: ActivityDurationSource,
    ) {}

    async getMediaDetailsByIds(mediaIds: number[]) {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];

        const [rows, durations] = await Promise.all([
            getDbClient().select({
                id: catalogItem.id,
                name: catalogItem.name,
                imageCover: catalogItem.imageCover,
                releaseDate: catalogItem.releaseDate,
            }).from(catalogItem).where(and(
                eq(catalogItem.kind, this.kind),
                inArray(catalogItem.id, uniqueIds),
            )),
            this.getMediaDurationsByIds(uniqueIds),
        ]);
        const durationById = new Map(durations.map((row) => [row.id, row.duration]));

        return rows.map((row) => ({
            ...row,
            duration: durationById.get(row.id) ?? undefined,
            releaseDate: row.releaseDate ?? "",
            imageCover: getImageUrl(`${this.kind}-covers`, row.imageCover),
            customCover: null,
        }));
    }

    async getMediaDurationsByIds(mediaIds: number[]): Promise<ActivityMediaDuration[]> {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];
        if (this.durations) return this.durations.getByIds(uniqueIds);

        const rows = await getDbClient().select({ id: catalogItem.id })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, this.kind), inArray(catalogItem.id, uniqueIds)));
        return rows.map(({ id }) => ({ id, duration: null }));
    }

    searchUserListByName(userId: number, query: string, limit: number) {
        return getDbClient().select({ mediaId: catalogItem.id })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, this.kind),
                like(catalogItem.name, `%${query}%`),
            ))
            .orderBy(catalogItem.name)
            .limit(limit);
    }
}
