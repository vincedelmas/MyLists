import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {SocialState} from "@/lib/utils/enums";

const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
const {SocialRepository} = await import("./social.repository");
let sqlite: Database;

beforeEach(() => {
    sqlite = new Database(":memory:");
    dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
    migrate(dbContext.db, { migrationsFolder: "./drizzle" });
    sqlite.run("PRAGMA foreign_keys = ON");
    sqlite.query(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < 1001)
        INSERT INTO user(id,name,email,email_verified,created_at,updated_at)
        SELECT x,printf('reader%04d',x),printf('reader%d@example.invalid',x),1,'2026-01-01','2026-01-01' FROM n`).run();
    sqlite.query("INSERT INTO followers(follower_id,followed_id,status) SELECT id,1,? FROM user WHERE id > 1").run(SocialState.ACCEPTED);
    sqlite.query("INSERT INTO followers(follower_id,followed_id,status) SELECT 1,id,? FROM user WHERE id > 1").run(SocialState.ACCEPTED);
});
afterEach(() => { sqlite.close(); dbContext.db = undefined; });

it("paginates accepted social lists in alphabetical order and preserves the viewer's follow status", async () => {
    for (const fetch of [SocialRepository.getUserFollowers, SocialRepository.getUserFollows]) {
        const first = await fetch(1, 1, 24);
        const second = await fetch(1, 1, 24, 24);
        const firstItems = "followers" in first ? first.followers : first.follows;
        const secondItems = "followers" in second ? second.followers : second.follows;
        expect(firstItems).toHaveLength(24);
        expect(secondItems[0].username).toBe("reader0026");
        expect(new Set([...firstItems, ...secondItems].map(item => item.id)).size).toBe(48);
        expect(firstItems[0].myFollowStatus).toBe(SocialState.ACCEPTED);
    }
    expect(await SocialRepository.getFollowCount(1)).toEqual({ followersCount: 1000, followsCount: 1000 });
    sqlite.query("UPDATE followers SET status = ? WHERE follower_id = 1001 AND followed_id = 1").run(SocialState.REQUESTED);
    const last = await SocialRepository.getUserFollowers(undefined, 1, 24, 984);
    expect(last.followers).toHaveLength(15);
    expect(last.followers.every(item => item.myFollowStatus === null)).toBe(true);
    expect((await SocialRepository.getFollowCount(1)).followersCount).toBe(999);
});
