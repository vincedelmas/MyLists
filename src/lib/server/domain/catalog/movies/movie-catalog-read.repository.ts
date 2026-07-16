import {and, asc, count, desc, eq, inArray, like, ne, sql} from "drizzle-orm";
import {JobType, MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogGenre, catalogItem, catalogItemGenre, libraryEntry, movieActor, movieDetails,} from "@/lib/server/database/schema";


/** Movie-specific catalog projection for the detail-page contract. */
export class MovieCatalogReadRepository {
    async findDetails(catalogItemId: number) {
        const details = getDbClient()
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
                originalName: movieDetails.originalName,
                homepage: movieDetails.homepage,
                duration: movieDetails.durationMinutes,
                originalLanguage: movieDetails.originalLanguage,
                voteAverage: movieDetails.voteAverage,
                voteCount: movieDetails.voteCount,
                popularity: movieDetails.popularity,
                budget: movieDetails.budget,
                revenue: movieDetails.revenue,
                tagline: movieDetails.tagline,
                collectionId: movieDetails.collectionExternalId,
                directorName: movieDetails.directorName,
                compositorName: movieDetails.compositorName,
            })
            .from(catalogItem)
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.id, catalogItemId),
                eq(catalogItem.kind, MediaType.MOVIES),
            ))
            .get();
        if (!details) return;

        const [actors, genres, collection] = await Promise.all([
            getDbClient()
                .select({ id: movieActor.id, name: movieActor.name })
                .from(movieActor)
                .where(eq(movieActor.catalogItemId, details.catalogItemId))
                .orderBy(movieActor.id),
            getDbClient()
                .select({ id: catalogGenre.id, name: catalogGenre.name })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(eq(catalogItemGenre.catalogItemId, details.catalogItemId))
                .orderBy(catalogGenre.id),
            this.findCollection(details.catalogItemId, details.collectionId),
        ]);

        const { catalogItemId: _, apiId, imageCover, ...media } = details;
        return {
            ...media,
            apiId: Number(apiId),
            imageCover: getImageUrl("movies-covers", imageCover),
            actors,
            genres,
            collection,
            providerData: {
                name: "TMDB",
                url: `https://www.themoviedb.org/movie/${apiId}`,
            },
        };
    }

    async findSimilar(catalogItemId: number) {
        const target = await getDbClient()
            .select({ catalogItemId: catalogItem.id })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, MediaType.MOVIES), eq(catalogItem.id, catalogItemId)))
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
                eq(catalogItem.kind, MediaType.MOVIES),
                ne(catalogItem.id, target.catalogItemId),
                inArray(catalogItemGenre.genreId, targetGenreIds.map(({ genreId }) => genreId)),
            ))
            .groupBy(catalogItem.id)
            .orderBy(desc(sql`count(${catalogItemGenre.genreId})`), asc(catalogItem.id))
            .limit(10)
            .then((rows) => rows.map(({ imageCover, commonGenreCount: _, ...row }) => ({
                ...row,
                mediaCover: getImageUrl("movies-covers", imageCover),
            })));
    }

    async getMediaJobDetails(job: JobType, name: string, offset: number, limit: number, viewerId?: number) {
        const matchingIds = this.jobCatalogIds(job, name);
        if (!matchingIds) return { items: [], total: 0, pages: 0 };
        const conditions = and(
            eq(catalogItem.kind, MediaType.MOVIES),
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
                imageCover: getImageUrl("movies-covers", imageCover),
                inUserList: viewerCatalogIds.has(catalogItemId),
            })),
            total,
            pages: Math.ceil(total / limit),
        };
    }

    private findCollection(catalogItemId: number, collectionId: number | null) {
        if (collectionId === null) return Promise.resolve([]);
        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                mediaCover: catalogItem.imageCover,
            })
            .from(movieDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, movieDetails.catalogItemId))
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(movieDetails.collectionExternalId, collectionId),
                ne(catalogItem.id, catalogItemId),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id))
            .then((rows) => rows.map(({ mediaCover, ...row }) => ({
                ...row,
                mediaCover: getImageUrl("movies-covers", mediaCover),
            })));
    }

    private jobCatalogIds(job: JobType, name: string) {
        if (job === JobType.ACTOR) {
            return getDbClient().select({ catalogItemId: movieActor.catalogItemId })
                .from(movieActor).where(like(movieActor.name, `%${name}%`));
        }
        if (job === JobType.CREATOR) {
            return getDbClient().select({ catalogItemId: movieDetails.catalogItemId })
                .from(movieDetails).where(like(movieDetails.directorName, `%${name}%`));
        }
        if (job === JobType.COMPOSITOR) {
            return getDbClient().select({ catalogItemId: movieDetails.catalogItemId })
                .from(movieDetails).where(like(movieDetails.compositorName, `%${name}%`));
        }
    }
}
