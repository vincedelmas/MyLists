import {createGBooksApi} from "@/lib/server/api-providers/api/gbooks.api";
import {createHltbApi} from "@/lib/server/api-providers/api/hltb.api";
import {createIgdbApi} from "@/lib/server/api-providers/api/igdb.api";
import {createMalApi} from "@/lib/server/api-providers/api/mal.api";
import {createTmdbApi} from "@/lib/server/api-providers/api/tmdb.api";


export const setupImportApiClientsModule = async () => {
    const [hltbClient, igdbClient, tmdbClient, malClient, gBookClient] = await Promise.all([
        createHltbApi(),
        createIgdbApi(),
        createTmdbApi(),
        createMalApi(),
        createGBooksApi(),
    ]);

    return {
        igdb: igdbClient,
        tmdb: tmdbClient,
        mal: malClient,
        gBook: gBookClient,
        hltb: hltbClient,
    };
};
