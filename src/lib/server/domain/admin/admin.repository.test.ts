import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const {adminRepository} = await import("@/lib/server/domain/admin/admin.repository");


describe("adminRepository year recap release", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("defaults to automatic and persists later overrides", async () => {
        await expect(adminRepository.getYearRecapReleaseMode(2026)).resolves.toBe("automatic");

        await adminRepository.updateYearRecapReleaseMode(2026, "enabled");
        await expect(adminRepository.getYearRecapReleaseMode(2026)).resolves.toBe("enabled");

        await adminRepository.updateYearRecapReleaseMode(2026, "disabled");
        await expect(adminRepository.getYearRecapReleaseMode(2026)).resolves.toBe("disabled");
    });
});
