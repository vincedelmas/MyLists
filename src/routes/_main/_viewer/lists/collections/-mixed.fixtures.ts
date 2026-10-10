import {and, eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";
import {privateCollection, users} from "../../../../../../scripts/e2e/data";
import {mixedCollection, mixedMedia} from "./-mixed.data";
import * as schema from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use collection fixtures only with bun run test:e2e.");

db.transaction(() => {
    const common = { id: 501, apiId: 501, imageCover: "default.jpg", releaseDate: "2020-01-01", lockStatus: true };
    const title = (mediaType: MediaType) => mixedMedia.find(item => item.mediaType === mediaType)!.name;
    db.insert(schema.movies).values({ ...common, name: title(MediaType.MOVIES), duration: 100 }).run();
    db.insert(schema.series).values({ ...common, name: title(MediaType.SERIES), duration: 30, totalSeasons: 1, totalEpisodes: 10 }).run();
    db.insert(schema.anime).values({ ...common, name: title(MediaType.ANIME), duration: 24, totalSeasons: 1, totalEpisodes: 12 }).run();
    db.insert(schema.books).values({ ...common, name: title(MediaType.BOOKS), apiId: "collection-book-501", pages: 240 }).run();
    db.insert(schema.manga).values({ ...common, name: title(MediaType.MANGA), chapters: 20 }).run();
    db.insert(schema.games).values({ ...common, name: title(MediaType.GAMES) }).run();
    db.insert(schema.booksList).values({ userId: users.stranger.id, mediaId: 501, status: Status.COMPLETED, rating: 9 }).run();
    db.update(schema.userMediaSettings).set({ active: true, totalEntries: 1, statusCounts: { [Status.COMPLETED]: 1 } as Record<Status, number> })
        .where(and(eq(schema.userMediaSettings.userId, users.stranger.id), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();

    db.insert(schema.collections).values({ ...mixedCollection, ownerId: users.owner.id, ordered: true, privacy: PrivacyType.PUBLIC }).run();
    db.insert(schema.collectionItems).values(mixedMedia.map((item, index) => ({
        collectionId: mixedCollection.id, mediaType: item.mediaType, mediaId: item.id,
        orderIndex: index + 1, annotation: `Note for ${item.mediaType}`,
    }))).run();
    if (process.argv.includes("seed-private")) {
        db.insert(schema.collectionItems).values(mixedMedia.map((item, index) => ({
            collectionId: privateCollection.id, mediaType: item.mediaType, mediaId: item.id, orderIndex: index + 2,
        }))).run();
    }
});
