import {MediaType} from "@/lib/utils/enums";
import {and, eq, inArray, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MovieCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {catalogGenre, catalogItem, catalogItemGenre, movieActor, movieDetails,} from "@/lib/server/database/schema";


/** Persists canonical TMDB snapshots into the movie catalog tables. */
export class MovieCatalogIngestionRepository {
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

    insertSnapshot(details: MovieCatalogSnapshot) {
        return this.persist(details, "store");
    }

    async replaceSnapshot(details: MovieCatalogSnapshot) {
        if (!await this.findByApiId(details.apiId)) return false;
        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: MovieCatalogSnapshot, mode: "store" | "refresh") {
        const apiId = String(details.apiId);
        const [item] = await getDbClient().insert(catalogItem).values({
            kind: MediaType.MOVIES,
            primaryProvider: "tmdb",
            primaryExternalId: apiId,
            name: details.name,
            releaseDate: details.releaseDate,
            synopsis: details.synopsis,
            imageCover: getImageFilename(details.imageCover),
            locked: details.locked ?? false,
            lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
        }).onConflictDoUpdate({
            target: [catalogItem.kind, catalogItem.primaryProvider, catalogItem.primaryExternalId],
            set: mode === "refresh" ? {
                name: details.name,
                releaseDate: details.releaseDate,
                synopsis: details.synopsis,
                imageCover: getImageFilename(details.imageCover),
                lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
            } : { lastProviderUpdate: sql`CURRENT_TIMESTAMP` },
        }).returning({ id: catalogItem.id });

        await getDbClient().insert(movieDetails).values({
            catalogItemId: item.id,
            originalName: details.originalName,
            homepage: details.homepage,
            durationMinutes: details.durationMinutes,
            originalLanguage: details.originalLanguage,
            voteAverage: details.voteAverage,
            voteCount: details.voteCount,
            popularity: details.popularity,
            budget: details.budget,
            revenue: details.revenue,
            tagline: details.tagline,
            collectionExternalId: details.collectionExternalId,
            directorName: details.directorName,
            compositorName: details.compositorName,
        }).onConflictDoUpdate({
            target: movieDetails.catalogItemId,
            set: {
                originalName: details.originalName,
                homepage: details.homepage,
                durationMinutes: details.durationMinutes,
                originalLanguage: details.originalLanguage,
                voteAverage: details.voteAverage,
                voteCount: details.voteCount,
                popularity: details.popularity,
                budget: details.budget,
                revenue: details.revenue,
                tagline: details.tagline,
                collectionExternalId: details.collectionExternalId,
                directorName: details.directorName,
                compositorName: details.compositorName,
            },
        });

        await Promise.all([
            this.syncActors(item.id, details.actors, mode),
            this.syncGenres(item.id, details.genres, mode),
        ]);
        return item.id;
    }

    private async syncActors(catalogItemId: number, rows: string[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        if (mode === "refresh") await getDbClient().delete(movieActor).where(eq(movieActor.catalogItemId, catalogItemId));
        await getDbClient().insert(movieActor).values(names.map((name) => ({ catalogItemId, name }))).onConflictDoNothing();
    }

    private async syncGenres(catalogItemId: number, rows: string[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        await getDbClient().insert(catalogGenre).values(names.map((name) => ({ name }))).onConflictDoNothing();
        const genres = await getDbClient().select().from(catalogGenre).where(inArray(catalogGenre.name, names));
        if (mode === "refresh") await getDbClient().delete(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, catalogItemId));
        await getDbClient().insert(catalogItemGenre)
            .values(genres.map(({ id }) => ({ catalogItemId, genreId: id }))).onConflictDoNothing();
    }
}


const uniqueNames = (rows?: string[]) => [...new Set((rows ?? []).map((name) => name.trim()).filter(Boolean))];
