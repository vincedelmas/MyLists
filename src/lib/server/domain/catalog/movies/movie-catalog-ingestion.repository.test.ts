import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: () => Promise<unknown>) => action(),
}));

const { MovieCatalogIngestionRepository } = await import("./movie-catalog-ingestion.repository");
const { MovieCatalogIngestionCommand } = await import("./movie-catalog-ingestion.command");
const { MovieLibraryRepository } = await import("@/lib/server/domain/library/movies/movie-library.repository");
const { MovieLibraryCommands } = await import("@/lib/server/domain/library/movies/movie-library.commands");


describe("movie catalog ingestion command", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 42,
            name: "movie-owner",
            email: "movie-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("reuses TMDB identity and repairs duration-based stats without user events on refresh", async () => {
        const transformed = details(100);
        const provider = {
            source: "tmdb" as const,
            mediaType: MediaType.MOVIES,
            search: { search: vi.fn() },
            details: { getDetails: vi.fn(async () => transformed) },
        } satisfies ExternalMediaProvider<UpsertMovieWithDetails>;
        const ingestion = createMediaIngestionService({
            provider,
            repository: new MovieCatalogIngestionCommand(new MovieCatalogIngestionRepository()),
        });
        const catalogItemId = await ingestion.storeFromExternal(777);
        expect(await ingestion.storeFromExternal(777)).toBe(catalogItemId);
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);

        const library = new MovieLibraryCommands(new MovieLibraryRepository());
        await library.add({ userId: 42, catalogItemId, status: Status.COMPLETED });
        await library.replaceRewatches({ userId: 42, catalogItemId, rewatchCount: 1 });
        provider.details.getDetails = vi.fn(async () => details(120));
        await ingestion.refreshFromExternal(777);

        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ timeSpentMinutes: 240, totalSpecific: 2, totalRedo: 1 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toHaveLength(1);
        expect(await db.select().from(schema.libraryChange)).toHaveLength(2);
        expect(await db.select().from(schema.movieActor)).toEqual([
            expect.objectContaining({ catalogItemId, name: "Actor" }),
        ]);
    });
});


const details = (duration: number): UpsertMovieWithDetails => ({
    mediaData: {
        apiId: 777,
        name: "Movie",
        imageCover: "movie.jpg",
        duration,
        originalLanguage: "en",
        directorName: "Director",
        compositorName: "Composer",
        budget: 100,
        revenue: 200,
    },
    actorsData: [{ name: "Actor" }],
    genresData: [{ name: "Drama" }],
});
