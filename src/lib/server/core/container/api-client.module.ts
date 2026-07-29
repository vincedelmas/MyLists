import {createGBooksApi, createHltbApi, createIgdbApi, createLlmApi, createMalApi, createTmdbApi} from "@/lib/server/api-providers/api";


export const setupApiClientsModule = async () => {
    const [hltbClient, igdbClient, tmdbClient, malClient, gBookClient, llmClient] = await Promise.all([
        createHltbApi(),
        createIgdbApi(),
        createTmdbApi(),
        createMalApi(),
        createGBooksApi(),
        createLlmApi(),
    ]);

    return {
        igdb: igdbClient,
        tmdb: tmdbClient,
        mal: malClient,
        gBook: gBookClient,
        hltb: hltbClient,
        llmClient: llmClient,
    };
};


export type ApiClientModule = Awaited<ReturnType<typeof setupApiClientsModule>>;
