import {eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {users} from "../../../../../scripts/e2e/data";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Activity fixtures require the isolated browser test database.");

db.transaction(tx => {
    tx.update(schema.userMediaSettings).set({ active: true }).where(eq(schema.userMediaSettings.userId, users.owner.id)).run();
    tx.insert(schema.books).values({
        id: 2001, apiId: "activity-book", name: "Activity alpha book", pages: 200, imageCover: "default.jpg",
    }).run();
    tx.insert(schema.movies).values({
        id: 2002, apiId: 2002, name: "Activity beta movie", duration: 120, imageCover: "default.jpg",
    }).run();
    tx.insert(schema.booksList).values({ userId: users.owner.id, mediaId: 2001, status: Status.READING }).run();
    tx.insert(schema.moviesList).values({ userId: users.owner.id, mediaId: 2002, status: Status.COMPLETED }).run();
    tx.insert(schema.userMediaMonthlyActivity).values([
        {
            userId: users.owner.id, mediaId: 2001, mediaType: MediaType.BOOKS,
            monthBucket: "2026-01", lastActivityAt: "2026-01-10T12:00:00Z", progressGained: 20,
        },
        {
            userId: users.owner.id, mediaId: 2001, mediaType: MediaType.BOOKS,
            monthBucket: "2026-06", lastActivityAt: "2026-06-05T12:00:00Z", progressGained: 10,
        },
        {
            userId: users.owner.id, mediaId: 2002, mediaType: MediaType.MOVIES,
            monthBucket: "2026-06", lastActivityAt: "2026-06-20T12:00:00Z", progressGained: 1, hadCompletion: true,
        },
    ]).run();
});
