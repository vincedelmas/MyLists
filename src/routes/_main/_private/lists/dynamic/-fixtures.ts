import {eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {MediaType, Status} from "@/lib/utils/enums";
import {movies, users} from "../../../../../../scripts/e2e/data";
import {books, booksList, moviesList, userMediaSettings} from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use dynamic list fixtures only with bun run test:e2e.");

db.transaction(() => {
    db.update(moviesList).set({ addedAt: "2000-01-01 00:00:00" }).where(eq(moviesList.mediaId, movies.private.id)).run();
    db.insert(moviesList).values({
        userId: users.owner.id,
        mediaId: movies.editable.id,
        status: Status.PLAN_TO_WATCH,
        addedAt: new Date().toISOString(),
    }).run();
    db.insert(books).values({
        id: 906,
        apiId: "dynamic-list-book",
        name: "A long-awaited book",
        imageCover: "default.jpg",
        pages: 200,
    }).run();
    db.insert(booksList).values({
        userId: users.owner.id,
        mediaId: 906,
        status: Status.PLAN_TO_READ,
        addedAt: "2000-01-02T00:00:00.000Z",
    }).run();
    db.update(userMediaSettings).set({ active: true }).where(eq(userMediaSettings.mediaType, MediaType.BOOKS)).run();
});
