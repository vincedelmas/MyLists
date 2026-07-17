import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {GameCatalogSnapshot} from "@/lib/server/domain/media/games/catalog/game-catalog-snapshot";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: () => Promise<unknown>) => action(),
}));

const { GameCatalogIngestionRepository } = await import("./game-catalog-ingestion.repository");
const { GameCatalogIngestionCommand } = await import("./game-catalog-ingestion.command");


describe("game catalog ingestion command", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("reuses IGDB identity, preserves HLTB units and refreshes concrete associations", async () => {
        const transformed = details("Old Engine");
        const provider = {
            source: "igdb" as const,
            mediaType: MediaType.GAMES,
            search: { search: vi.fn() },
            details: { getDetails: vi.fn(async () => transformed) },
        } satisfies ExternalMediaProvider<GameCatalogSnapshot>;
        const ingestion = createMediaIngestionService({
            provider,
            catalog: new GameCatalogIngestionCommand(new GameCatalogIngestionRepository()),
        });

        const catalogItemId = await ingestion.storeFromExternal(777);
        expect(await ingestion.storeFromExternal(777)).toBe(catalogItemId);
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);

        provider.details.getDetails = vi.fn(async () => details("New Engine"));
        await ingestion.refreshFromExternal(777);

        expect(await db.select().from(schema.gameDetails)).toEqual([
            expect.objectContaining({
                catalogItemId,
                gameEngine: "New Engine",
                hltbMainHours: 20.5,
                hltbMainExtraHours: null,
                hltbCompletionistHours: 80,
            }),
        ]);
        expect(await db.select().from(schema.gamePlatform)).toEqual([
            expect.objectContaining({ catalogItemId, name: "PC (Microsoft Windows)" }),
        ]);
        expect(await db.select().from(schema.gameCompany)).toEqual([
            expect.objectContaining({ catalogItemId, name: "Studio", developer: true, publisher: true }),
        ]);
    });
});


const details = (engine: string): GameCatalogSnapshot => ({
    apiId: 777,
    name: "Game",
    imageCover: "game.jpg",
    gameEngine: engine,
    hltbMainHours: 20.5,
    hltbMainExtraHours: -1,
    hltbCompletionistHours: 80,
    platforms: ["PC (Microsoft Windows)"],
    companies: [
        { name: "Studio", developer: true, publisher: false },
        { name: "Studio", developer: false, publisher: true },
    ],
    genres: ["Role-playing"],
});
