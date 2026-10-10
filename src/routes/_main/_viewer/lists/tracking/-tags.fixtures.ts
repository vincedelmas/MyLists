import {eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {users} from "../../../../../../scripts/e2e/data";
import {browseMovies} from "../collections/-browse.data";
import {moviesTags, user} from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use tag fixtures only with bun run test:e2e.");

db.transaction(() => {
    db.insert(moviesTags).values([
        { userId: users.owner.id, mediaId: browseMovies.at(-1)!.id, name: "rewatch" },
        { userId: users.owner.id, mediaId: browseMovies.at(-1)!.id, name: "shelf" },
        { userId: users.owner.id, name: "unassigned" },
    ]).run();

    if (process.argv.includes("public-owner")) {
        db.update(user).set({ privacy: "public" }).where(eq(user.id, users.owner.id)).run();
    }
});
