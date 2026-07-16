import {and, asc, eq, gte, isNotNull, lte, ne, SQL, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {CoverType} from "@/lib/types/media-common.types";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameDetails, mangaDetails, movieDetails, tvDetails} from "@/lib/server/database/schema";


type WcfMediaRef = { id: number; releaseDate: string };
type WcfMediaCard = { mediaId: number; mediaType: MediaType; name: string; imageCover: string };


export interface WcfMediaCatalog {
    getPopularMediaRefs(mediaType: MediaType): Promise<WcfMediaRef[]>;
    findById(mediaType: MediaType, mediaId: number): Promise<WcfMediaCard | undefined>;
}


export class WcfMediaCatalogRepository implements WcfMediaCatalog {
    async getPopularMediaRefs(mediaType: MediaType) {
        switch (mediaType) {
            case MediaType.SERIES:
            case MediaType.ANIME:
                return getDbClient().select({ id: catalogItem.id, releaseDate: catalogItem.releaseDate })
                    .from(tvDetails)
                    .innerJoin(catalogItem, eq(catalogItem.id, tvDetails.catalogItemId))
                    .where(eligibility(mediaType, gte(tvDetails.voteCount, mediaType === MediaType.SERIES ? 300 : 50)))
                    .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
            case MediaType.MOVIES:
                return getDbClient().select({ id: catalogItem.id, releaseDate: catalogItem.releaseDate })
                    .from(movieDetails)
                    .innerJoin(catalogItem, eq(catalogItem.id, movieDetails.catalogItemId))
                    .where(eligibility(mediaType, gte(movieDetails.voteCount, 1000)))
                    .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
            case MediaType.GAMES:
                return getDbClient().select({ id: catalogItem.id, releaseDate: catalogItem.releaseDate })
                    .from(gameDetails)
                    .innerJoin(catalogItem, eq(catalogItem.id, gameDetails.catalogItemId))
                    .where(eligibility(mediaType, gte(gameDetails.voteCount, 100)))
                    .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
            case MediaType.MANGA:
                return getDbClient().select({ id: catalogItem.id, releaseDate: catalogItem.releaseDate })
                    .from(mangaDetails)
                    .innerJoin(catalogItem, eq(catalogItem.id, mangaDetails.catalogItemId))
                    .where(eligibility(mediaType, gte(mangaDetails.voteCount, 5000)))
                    .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
            case MediaType.BOOKS:
                return [];
        }
    }

    async findById(mediaType: MediaType, mediaId: number) {
        const row = await getDbClient().select({ name: catalogItem.name, imageCover: catalogItem.imageCover })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, mediaType), eq(catalogItem.id, mediaId)))
            .get();
        if (!row) return;
        return {
            ...row,
            mediaId,
            mediaType,
            imageCover: getImageUrl(`${mediaType}-covers` as CoverType, row.imageCover),
        };
    }
}


const eligibility = (mediaType: MediaType, popularity: SQL) => and(
    eq(catalogItem.kind, mediaType),
    popularity,
    isNotNull(catalogItem.releaseDate),
    ne(catalogItem.imageCover, "default.jpg"),
    ne(catalogItem.releaseDate, ""),
    lte(catalogItem.releaseDate, sql`date('now')`),
);
