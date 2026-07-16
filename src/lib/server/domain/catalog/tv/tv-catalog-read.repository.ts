import {and, asc, count, desc, eq, inArray, like, ne, sql} from "drizzle-orm";
import {JobType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    tvActor,
    tvDetails,
    tvNetwork,
    tvSeason,
    libraryEntry,
} from "@/lib/server/database/schema";


/** Read model for the series/anime catalog using catalog item IDs. */
export class TvCatalogReadRepository {
    constructor(private readonly kind: TvMediaType) {}

    async findDetails(catalogItemId: number) {
        const details = await getDbClient()
            .select({
                catalogItemId: catalogItem.id,
                id: catalogItem.id,
                name: catalogItem.name,
                releaseDate: catalogItem.releaseDate,
                synopsis: catalogItem.synopsis,
                imageCover: catalogItem.imageCover,
                lockStatus: catalogItem.locked,
                addedAt: catalogItem.addedAt,
                lastApiUpdate: catalogItem.lastProviderUpdate,
                apiId: catalogItem.primaryExternalId,
                originalName: tvDetails.originalName,
                lastAirDate: tvDetails.lastAirDate,
                homepage: tvDetails.homepage,
                createdBy: tvDetails.createdBy,
                duration: tvDetails.episodeDurationMinutes,
                totalSeasons: tvDetails.totalSeasons,
                totalEpisodes: tvDetails.totalEpisodes,
                originCountry: tvDetails.originCountry,
                prodStatus: tvDetails.productionStatus,
                voteAverage: tvDetails.voteAverage,
                voteCount: tvDetails.voteCount,
                popularity: tvDetails.popularity,
                seasonToAir: tvDetails.nextEpisodeSeason,
                episodeToAir: tvDetails.nextEpisodeNumber,
                nextEpisodeToAir: tvDetails.nextEpisodeAirDate,
            })
            .from(catalogItem)
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.id, catalogItemId),
                eq(catalogItem.kind, this.kind),
            ))
            .get();
        if (!details) return;

        const [actors, genres, networks, epsPerSeason] = await Promise.all([
            getDbClient()
                .select({ id: tvActor.id, name: tvActor.name })
                .from(tvActor)
                .where(eq(tvActor.catalogItemId, details.catalogItemId))
                .orderBy(tvActor.name),
            getDbClient()
                .select({ id: catalogGenre.id, name: catalogGenre.name })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(eq(catalogItemGenre.catalogItemId, details.catalogItemId))
                .orderBy(catalogGenre.name),
            getDbClient()
                .select({ id: tvNetwork.id, name: tvNetwork.name })
                .from(tvNetwork)
                .where(eq(tvNetwork.catalogItemId, details.catalogItemId))
                .orderBy(tvNetwork.name),
            getDbClient()
                .select({ season: tvSeason.seasonNumber, episodes: tvSeason.episodeCount })
                .from(tvSeason)
                .where(eq(tvSeason.catalogItemId, details.catalogItemId))
                .orderBy(tvSeason.seasonNumber),
        ]);

        const { catalogItemId: _, apiId, imageCover, ...media } = details;
        return {
            ...media,
            apiId: Number(apiId),
            imageCover: getImageUrl(`${this.kind}-covers`, imageCover),
            actors,
            genres,
            networks,
            epsPerSeason,
            providerData: {
                name: "TMDB",
                url: `https://www.themoviedb.org/tv/${apiId}`,
            },
        };
    }

    async findSimilar(catalogItemId: number) {
        const target = await getDbClient()
            .select({ catalogItemId: catalogItem.id })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, this.kind), eq(catalogItem.id, catalogItemId)))
            .get();
        if (!target) return [];

        const targetGenreIds = await getDbClient()
            .select({ genreId: catalogItemGenre.genreId })
            .from(catalogItemGenre)
            .where(eq(catalogItemGenre.catalogItemId, target.catalogItemId));
        if (targetGenreIds.length === 0) return [];

        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                commonGenreCount: count(catalogItemGenre.genreId),
            })
            .from(catalogItemGenre)
            .innerJoin(catalogItem, eq(catalogItem.id, catalogItemGenre.catalogItemId))
            .where(and(
                eq(catalogItem.kind, this.kind),
                ne(catalogItem.id, target.catalogItemId),
                inArray(catalogItemGenre.genreId, targetGenreIds.map(({ genreId }) => genreId)),
            ))
            .groupBy(catalogItem.id)
            .orderBy(
                desc(sql`count(${catalogItemGenre.genreId})`),
                asc(catalogItem.id),
            )
            .limit(10)
            .then((rows) => rows.map(({ imageCover, commonGenreCount: _, ...row }) => ({
                ...row,
                mediaCover: getImageUrl(`${this.kind}-covers`, imageCover),
            })));
    }

    async getMediaJobDetails(job: JobType, name: string, offset: number, limit: number, viewerId?: number) {
        let matchingIds;
        if (job === JobType.ACTOR) {
            matchingIds = getDbClient()
                .select({ catalogItemId: tvActor.catalogItemId })
                .from(tvActor)
                .where(like(tvActor.name, `%${name}%`));
        }
        else if (job === JobType.PLATFORM) {
            matchingIds = getDbClient()
                .select({ catalogItemId: tvNetwork.catalogItemId })
                .from(tvNetwork)
                .where(like(tvNetwork.name, `%${name}%`));
        }
        else if (job === JobType.CREATOR) {
            matchingIds = getDbClient()
                .select({ catalogItemId: tvDetails.catalogItemId })
                .from(tvDetails)
                .where(like(tvDetails.createdBy, `%${name}%`));
        }
        else {
            return { items: [], total: 0, pages: 0 };
        }

        const conditions = and(
            eq(catalogItem.kind, this.kind),
            inArray(catalogItem.id, matchingIds),
        );
        const [rows, totalRow] = await Promise.all([
            getDbClient()
                .select({
                    catalogItemId: catalogItem.id,
                    mediaId: catalogItem.id,
                    mediaName: catalogItem.name,
                    imageCover: catalogItem.imageCover,
                    releaseDate: catalogItem.releaseDate,
                })
                .from(catalogItem)
                .where(conditions)
                .orderBy(asc(catalogItem.releaseDate))
                .limit(limit)
                .offset(offset),
            getDbClient()
                .select({ value: count() })
                .from(catalogItem)
                .where(conditions)
                .get(),
        ]);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);
        const viewerEntries = viewerId && catalogItemIds.length > 0
            ? await getDbClient()
                .select({ catalogItemId: libraryEntry.catalogItemId })
                .from(libraryEntry)
                .where(and(eq(libraryEntry.userId, viewerId), inArray(libraryEntry.catalogItemId, catalogItemIds)))
            : [];
        const viewerCatalogIds = new Set(viewerEntries.map(({ catalogItemId }) => catalogItemId));
        const total = totalRow?.value ?? 0;

        return {
            items: rows.map(({ catalogItemId, imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl(`${this.kind}-covers`, imageCover),
                inUserList: viewerCatalogIds.has(catalogItemId),
            })),
            total,
            pages: Math.ceil(total / limit),
        };
    }
}
