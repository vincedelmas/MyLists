import {eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {movies, users} from "../../../../../scripts/e2e/data";
import {moviesList, followers, user} from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use bun run test:e2e.");

db.transaction(() => {
    db.update(user).set({ privacy: "private" }).where(eq(user.id, users.restricted.id)).run();
    db.insert(followers).values([
        { followerId: users.owner.id, followedId: users.restricted.id, status: "accepted" },
        { followerId: users.owner.id, followedId: users.stranger.id, status: "requested" },
    ]).run();
    db.update(moviesList).set({ rating: 9 }).where(eq(moviesList.userId, users.owner.id)).run();
    db.update(moviesList).set({ rating: 10 }).where(eq(moviesList.userId, users.restricted.id)).run();
    db.insert(moviesList).values([
        { userId: users.owner.id, mediaId: movies.editable.id, status: "Completed", rating: 6 },
        { userId: users.stranger.id, mediaId: movies.imported.id, status: "Completed", rating: 8 },
        { userId: users.follower.id, mediaId: movies.editable.id, status: "Completed", rating: 7 },
    ]).run();
});
