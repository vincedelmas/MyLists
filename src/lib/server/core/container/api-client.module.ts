import {createGBooksApi, createHltbApi, createIgdbApi, createJikanApi, createLlmApi, createTmdbApi} from "@/lib/server/api-providers/api";


export const setupApiClientsModule = async () => {
    const [hltbClient, igdbClient, tmdbClient, jikanClient, gBookClient, llmClient] = await Promise.all([
        createHltbApi(),
        createIgdbApi(),
        createTmdbApi(),
        createJikanApi(),
        createGBooksApi(),
        createLlmApi(),
    ]);

    return {
        igdb: igdbClient,
        tmdb: tmdbClient,
        jikan: jikanClient,
        gBook: gBookClient,
        hltb: hltbClient,
        llmClient: llmClient,
    };
};


export type ApiClientModule = Awaited<ReturnType<typeof setupApiClientsModule>>;
