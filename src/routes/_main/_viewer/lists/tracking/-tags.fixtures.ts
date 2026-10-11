import {MediaType} from "@/lib/utils/enums";
import {seedMediaTags} from "@/lib/server/domain/media/tag-test-utils";
import {eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {users} from "../../../../../../scripts/e2e/data";
import {browseMovies} from "../collections/-browse.data";
import {user} from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use tag fixtures only with bun run test:e2e.");

db.transaction(() => {
    seedMediaTags(db, MediaType.MOVIES, [
        { userId: users.owner.id, mediaId: browseMovies.at(-1)!.id, name: "rewatch" },
        { userId: users.owner.id, mediaId: browseMovies.at(-1)!.id, name: "shelf" },
        { userId: users.owner.id, name: "unassigned" },
    ]);

    if (process.argv.includes("many-tags")) {
        seedMediaTags(db, MediaType.MOVIES, Array.from({ length: 100 }, (_, index) => ({
            userId: users.owner.id,
            name: `Shelf ${String(index + 1).padStart(3, "0")}`,
        })));
    }

    if (process.argv.includes("public-owner")) {
        db.update(user).set({ privacy: "public" }).where(eq(user.id, users.owner.id)).run();
    }
});
