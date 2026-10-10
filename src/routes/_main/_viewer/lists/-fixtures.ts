import {db} from "@/lib/server/database/db";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {collectionItems, collections, dynamicLists} from "@/lib/server/database/schema";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import {movies, users} from "../../../../../scripts/e2e/data";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use hub fixtures only with bun run test:e2e.");

db.transaction(() => {
    db.insert(collections).values(Array.from({ length: 14 }, (_, index) => ({
        id: 701 + index,
        ownerId: users.owner.id,
        title: index === 13 ? "Hub private collection" : `Hub collection ${String(index + 1).padStart(2, "0")}`,
        privacy: index === 13 ? PrivacyType.PRIVATE : PrivacyType.PUBLIC,
        likeCount: 20 - index,
    }))).run();
    db.insert(collectionItems).values(Array.from({ length: 14 }, (_, index) => ({
        collectionId: 701 + index, mediaType: MediaType.MOVIES, mediaId: movies.editable.id, orderIndex: 0,
    }))).run();
    db.insert(collectionItems).values({ collectionId: 701, mediaType: MediaType.BOOKS, mediaId: 906, orderIndex: 1 }).run();
    if (process.argv.includes("seed-dynamic-pagination")) {
        db.insert(dynamicLists).values(Array.from({ length: 10 }, (_, index) => ({
            id: 801 + index,
            userId: users.owner.id,
            spec: { ...DYNAMIC_LIST_PRESETS[0], title: `Hub dynamic ${String(index + 1).padStart(2, "0")}` },
        }))).run();
    }
});
