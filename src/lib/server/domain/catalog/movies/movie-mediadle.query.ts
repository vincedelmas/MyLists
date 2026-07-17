import {and, asc, eq, gte, like, notInArray, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, movieDetails} from "@/lib/server/database/schema";


type MediadleMovie = {
    id: number;
    name: string;
    imageCover: string;
};


export interface MovieMediadleQuery {
    findById(mediaId: number): Promise<MediadleMovie | undefined>;

    searchSuggestions(query: string, limit?: number): Promise<Array<{ id: number; name: string }>>;

    getEligibleIds(excludedMediaIds: number[]): Promise<number[]>;

    pickEligibleId(excludedMediaIds: number[]): Promise<number | undefined>;
}


/** Movie-owned selection and lookup policy for the Mediadle game. */
export class MovieMediadleCatalogQuery implements MovieMediadleQuery {
    async findById(mediaId: number) {
        const row = getDbClient().select({
            id: catalogItem.id,
            name: catalogItem.name,
            imageCover: catalogItem.imageCover,
        }).from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(catalogItem.id, mediaId),
            )).get();
        if (!row) return;
        return { ...row, imageCover: getImageUrl("movies-covers", row.imageCover) };
    }

    async searchSuggestions(query: string, limit = 20) {
        return getDbClient().select({
            id: catalogItem.id,
            name: catalogItem.name,
        }).from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                like(catalogItem.name, `%${query.toLowerCase()}%`),
            ))
            .orderBy(catalogItem.name)
            .limit(limit);
    }

    async getEligibleIds(excludedMediaIds: number[]) {
        return this.eligibleQuery(excludedMediaIds).orderBy(asc(catalogItem.id))
            .then((rows) => rows.map(({ id }) => id));
    }

    async pickEligibleId(excludedMediaIds: number[]) {
        return this.eligibleQuery(excludedMediaIds).orderBy(sql`RANDOM()`).limit(1)
            .then(([row]) => row?.id);
    }

    private eligibleQuery(excludedMediaIds: number[]) {
        return getDbClient().select({ id: catalogItem.id })
            .from(movieDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, movieDetails.catalogItemId))
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                gte(movieDetails.voteCount, 700),
                excludedMediaIds.length > 0
                    ? notInArray(catalogItem.id, excludedMediaIds)
                    : undefined,
            ));
    }
}
