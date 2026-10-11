import {db} from "@/lib/server/database/db";
import {MediaType} from "@/lib/utils/enums";
import {mixedMedia} from "./-mixed.data";
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
});
