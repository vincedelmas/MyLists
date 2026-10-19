import "../lists/collections/-mixed.fixtures";
import {eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import * as schema from "@/lib/server/database/schema";


db.transaction(() => {
    db.update(schema.userMediaSettings).set({ active: true }).where(eq(schema.userMediaSettings.userId, 1)).run();
    db.insert(schema.seriesEpisodesPerSeason).values({ mediaId: 501, season: 1, episodes: 10 }).run();
    db.insert(schema.animeEpisodesPerSeason).values({ mediaId: 501, season: 1, episodes: 12 }).run();
    db.update(schema.games).set({ hltbLastCheckedAt: new Date().toISOString() }).where(eq(schema.games.id, 501)).run();
});
