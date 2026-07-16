import {MediaType} from "@/lib/utils/enums";
import {and, eq, inArray, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {MovieLibraryService} from "@/lib/server/domain/library/movies/movie-library.service";
import {MovieLibraryRepository} from "@/lib/server/domain/library/movies/movie-library.repository";
import {catalogGenre, catalogItem, catalogItemGenre, movieActor, movieDetails,} from "@/lib/server/database/schema";


/** Adapter from the retained TMDB movie transformer into the concrete movie catalog. */
export class MovieCatalogIngestionRepository implements MediaIngestionRepository<UpsertMovieWithDetails> {
    private readonly libraryRepository = new MovieLibraryRepository();
    private readonly libraryService = new MovieLibraryService(this.libraryRepository);

    async findByApiId(apiId: number | string) {
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(catalogItem.primaryProvider, "tmdb"),
                eq(catalogItem.primaryExternalId, String(apiId)),
            )).get();
    }

    async findByApiIds(apiIds: (number | string)[]) {
        if (apiIds.length === 0) return [];
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(catalogItem.primaryProvider, "tmdb"),
                inArray(catalogItem.primaryExternalId, apiIds.map(String)),
            ));
    }

    async findByNames(names: string[]) {
        if (names.length === 0) return [];
        return getDbClient()
            .select({ id: catalogItem.id, name: catalogItem.name, releaseDate: catalogItem.releaseDate })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                inArray(sql<string>`lower(trim(${catalogItem.name}))`, names),
            ));
    }

    storeMediaWithDetails(details: UpsertMovieWithDetails) {
        return this.persist(details, "store");
    }

    async updateMediaWithDetails(details: UpsertMovieWithDetails) {
        if (!await this.findByApiId(details.mediaData.apiId)) return false;
        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: UpsertMovieWithDetails, mode: "store" | "refresh") {
        const apiId = String(details.mediaData.apiId);
        const existing = await this.findByApiId(apiId);
        const previousEntries = existing && mode === "refresh"
            ? await this.libraryRepository.findEntriesByCatalogItem(existing.id)
            : [];

        const [item] = await getDbClient().insert(catalogItem).values({
            kind: MediaType.MOVIES,
            primaryProvider: "tmdb",
            primaryExternalId: apiId,
            name: details.mediaData.name,
            releaseDate: details.mediaData.releaseDate,
            synopsis: details.mediaData.synopsis,
            imageCover: getImageFilename(details.mediaData.imageCover),
            locked: details.mediaData.lockStatus ?? false,
            lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
        }).onConflictDoUpdate({
            target: [catalogItem.kind, catalogItem.primaryProvider, catalogItem.primaryExternalId],
            set: mode === "refresh" ? {
                name: details.mediaData.name,
                releaseDate: details.mediaData.releaseDate,
                synopsis: details.mediaData.synopsis,
                imageCover: getImageFilename(details.mediaData.imageCover),
                lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
            } : { lastProviderUpdate: sql`CURRENT_TIMESTAMP` },
        }).returning({ id: catalogItem.id });

        await getDbClient().insert(movieDetails).values({
            catalogItemId: item.id,
            originalName: details.mediaData.originalName,
            homepage: details.mediaData.homepage,
            durationMinutes: details.mediaData.duration,
            originalLanguage: details.mediaData.originalLanguage,
            voteAverage: details.mediaData.voteAverage,
            voteCount: details.mediaData.voteCount,
            popularity: details.mediaData.popularity,
            budget: details.mediaData.budget,
            revenue: details.mediaData.revenue,
            tagline: details.mediaData.tagline,
            collectionExternalId: details.mediaData.collectionId,
            directorName: details.mediaData.directorName,
            compositorName: details.mediaData.compositorName,
        }).onConflictDoUpdate({
            target: movieDetails.catalogItemId,
            set: {
                originalName: details.mediaData.originalName,
                homepage: details.mediaData.homepage,
                durationMinutes: details.mediaData.duration,
                originalLanguage: details.mediaData.originalLanguage,
                voteAverage: details.mediaData.voteAverage,
                voteCount: details.mediaData.voteCount,
                popularity: details.mediaData.popularity,
                budget: details.mediaData.budget,
                revenue: details.mediaData.revenue,
                tagline: details.mediaData.tagline,
                collectionExternalId: details.mediaData.collectionId,
                directorName: details.mediaData.directorName,
                compositorName: details.mediaData.compositorName,
            },
        });

        await Promise.all([
            this.syncActors(item.id, details.actorsData, mode),
            this.syncGenres(item.id, details.genresData, mode),
        ]);
        if (previousEntries.length > 0) await this.libraryService.reconcileCatalogMetadata(previousEntries);
        return item.id;
    }

    private async syncActors(catalogItemId: number, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        if (mode === "refresh") await getDbClient().delete(movieActor).where(eq(movieActor.catalogItemId, catalogItemId));
        await getDbClient().insert(movieActor).values(names.map((name) => ({ catalogItemId, name }))).onConflictDoNothing();
    }

    private async syncGenres(catalogItemId: number, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        await getDbClient().insert(catalogGenre).values(names.map((name) => ({ name }))).onConflictDoNothing();
        const genres = await getDbClient().select().from(catalogGenre).where(inArray(catalogGenre.name, names));
        if (mode === "refresh") await getDbClient().delete(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, catalogItemId));
        await getDbClient().insert(catalogItemGenre)
            .values(genres.map(({ id }) => ({ catalogItemId, genreId: id }))).onConflictDoNothing();
    }
}


const uniqueNames = (rows?: { name: string }[]) => [...new Set((rows ?? []).map(({ name }) => name.trim()).filter(Boolean))];
