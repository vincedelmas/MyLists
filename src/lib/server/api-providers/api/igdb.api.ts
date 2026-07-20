import {eq} from "drizzle-orm";
import {serverEnv} from "@/env/server";
import {notFound} from "@tanstack/react-router";
import {ApiProviderType} from "@/lib/utils/enums";
import {apiTokens} from "@/lib/server/database/schema";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";
import {IgdbGameCollectionIds, IgdbGameDetails, IgdbSearchResponse, IgdbSearchResultItem, IgdbTokenResponse, IgdbTrendGamesResponse, SearchData} from "@/lib/types/provider.types";


type IgdbApiConfig = ApiClientConfig & {
    baseUrl: string;
    trendingUrl: string;
    tokenCacheKey: string;
    externalGamesUrl: string;
    tokenCacheExpiryMs: number;
};


const MAX_SEARCH_QUERY_LENGTH = 100;


const createConfig = (): IgdbApiConfig => ({
    resultsPerPage: 20,
    consumeKey: "igdb-API",
    tokenCacheKey: "igdb:accessToken",
    tokenCacheExpiryMs: 24 * 60 * 60 * 1000,
    baseUrl: "https://api.igdb.com/v4/games",
    externalGamesUrl: "https://api.igdb.com/v4/external_games",
    trendingUrl: "https://trendingnow.games/api/public/feeds/trending",
    throttleOptions: [{
        points: 3,
        duration: 1,
        keyPrefix: "igdbAPI",
    }],
});


const getCredentials = () => {
    if (!serverEnv.IGDB_CLIENT_ID || !serverEnv.IGDB_CLIENT_SECRET) {
        throw new FormattedError("Game search is unavailable because IGDB is not configured.");
    }
    return {
        clientId: serverEnv.IGDB_CLIENT_ID,
        clientSecret: serverEnv.IGDB_CLIENT_SECRET,
    };
};


export const createIgdbApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);
    const resultsPerPage = config.resultsPerPage ?? 20;

    function sanitizeSearchQuery(query: string) {
        return query
            .replace(/\s+/g, " ")
            .replace(/[;{}]/g, "")
            .trim()
            .slice(0, MAX_SEARCH_QUERY_LENGTH);
    }

    const fetchNewIgdbToken = async (): Promise<IgdbTokenResponse> => {
        const { clientId, clientSecret } = getCredentials();
        
        const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
        const response = await http.call(url, "post");

        return response.json();
    };

    const refreshAccessToken = async () => {
        const tokenResponse = await fetchNewIgdbToken();

        const accessToken = tokenResponse?.access_token;
        if (!accessToken) throw new Error("IGDB API returned an empty access token");

        const expiresAt = new Date(Date.now() + (tokenResponse.expires_in ?? 0) * 1000);
        await getDbClient()
            .insert(apiTokens)
            .values({
                expiresAt,
                accessToken,
                provider: ApiProviderType.IGDB,
            })
            .onConflictDoUpdate({
                target: apiTokens.provider,
                set: { accessToken, expiresAt },
            });

        const cacheStore = await getContainer().then((c) => c.cacheManager);
        const ttlMs = Math.max(expiresAt.getTime() - Date.now() - config.tokenCacheExpiryMs, 0);
        if (ttlMs > 0) {
            await cacheStore.set(config.tokenCacheKey, accessToken, ttlMs);
        }

        return accessToken;
    };

    const getAccessToken = async () => {
        const cacheStore = await getContainer().then((c) => c.cacheManager);

        const cachedToken = await cacheStore.get<string>(config.tokenCacheKey);
        if (cachedToken) return cachedToken;

        const existingToken = getDbClient()
            .select({
                expiresAt: apiTokens.expiresAt,
                accessToken: apiTokens.accessToken,
            })
            .from(apiTokens)
            .where(eq(apiTokens.provider, ApiProviderType.IGDB))
            .get();

        if (existingToken) {
            const msLeft = existingToken.expiresAt.getTime() - Date.now();
            if (msLeft > config.tokenCacheExpiryMs) {
                const ttlMs = Math.max(msLeft - config.tokenCacheExpiryMs, 0);
                if (ttlMs > 0) {
                    await cacheStore.set(config.tokenCacheKey, existingToken.accessToken, ttlMs);
                }

                return existingToken.accessToken;
            }
        }

        return refreshAccessToken();
    };

    const getHeaders = async () => {
        const { clientId } = getCredentials();
        const accessToken = await getAccessToken();

        return {
            "Client-ID": clientId,
            "Accept": "application/json",
            "Content-Type": "text/plain",
            "Authorization": `Bearer ${accessToken}`,
        };
    };

    return {
        async search(query: string, page: number = 1): Promise<SearchData<IgdbSearchResponse>> {
            const offset = (page - 1) * resultsPerPage;
            const sanitizedQuery = sanitizeSearchQuery(query);

            if (sanitizedQuery.length < 2) {
                return {
                    page,
                    resultsPerPage,
                    rawData: { count: 0, result: [] },
                };
            }

            const escapedQuery = sanitizedQuery.replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .trim();

            const headers = await getHeaders();
            const response = await http.call(config.baseUrl, "post", {
                headers,
                body: `
                    fields id, name, cover.image_id, first_release_date;
                    search "${escapedQuery}";
                    where version_parent = null;
                    limit ${resultsPerPage + 1};
                    offset ${offset};
                `,
            });

            const rawResults = await response.json() as IgdbSearchResultItem[];

            const result = rawResults.slice(0, resultsPerPage);
            const count = offset + result.length + (rawResults.length > resultsPerPage ? 1 : 0);

            return {
                page,
                resultsPerPage,
                rawData: { count, result },
            }
        },

        async getGameDetails(apiId: number): Promise<IgdbGameDetails> {
            const body = `
                fields name, cover.image_id, game_engines.name, game_modes.name, platforms.name, genres.name, 
                player_perspectives.name, total_rating, total_rating_count, first_release_date, 
                involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
                summary, themes.name, collections, url, external_games.uid, external_games.external_game_source;
                where id = ${apiId};
            `;

            const headers = await getHeaders();
            const response = await http.call(`${config.baseUrl}`, "post", { headers, body });

            const rawData = await response.json() as IgdbGameDetails[];
            if (rawData.length === 0) throw notFound();

            return rawData[0];
        },

        async getGamesDetails(apiIds: number[]): Promise<IgdbGameDetails[]> {
            if (apiIds.length === 0) return [];

            const body = `
                fields name, cover.image_id, game_engines.name, game_modes.name, platforms.name, genres.name, 
                player_perspectives.name, total_rating, total_rating_count, first_release_date, 
                involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
                summary, themes.name, collections, url, external_games.uid, external_games.external_game_source;
                where id = (${apiIds.join(",")});
                limit ${apiIds.length};
            `;

            const headers = await getHeaders();
            const response = await http.call(config.baseUrl, "post", { headers, body });
            return await response.json() as Promise<IgdbGameDetails[]>;
        },

        // TODO: to remove after backfilling
        async getGamesCollectionIds(apiIds: number[]): Promise<IgdbGameCollectionIds[]> {
            if (apiIds.length === 0) return [];

            const body = `fields id, collections; where id = (${apiIds.join(",")}); limit ${apiIds.length};`;

            const headers = await getHeaders();
            const response = await http.call(config.baseUrl, "post", { headers, body });

            return await response.json() as Promise<IgdbGameCollectionIds[]>;
        },

        async getTrendingGames(): Promise<IgdbTrendGamesResponse[]> {
            const trendRes = await http.call(config.trendingUrl);
            const trendsData = await trendRes.json() as { games: { steam_appid: number }[] };
            const steamIds = trendsData.games.map((game) => game.steam_appid);

            const body = `
                fields uid, game.name, game.summary, game.cover.image_id, game.first_release_date;
                where external_game_source = 1 & uid = (${steamIds.join(",")});
                limit ${steamIds.length};
            `;

            const headers = await getHeaders();
            const response = await http.call(config.externalGamesUrl, "post", { headers, body });
            const igdbResults = await response.json() as IgdbTrendGamesResponse[];

            const resultsMap = new Map(igdbResults.map((item) => [Number(item.uid), item]));

            return steamIds
                .map((id) => resultsMap.get(id))
                .filter((game): game is IgdbTrendGamesResponse => !!game);
        },

        refreshAccessToken,

        fetchNewIgdbToken,
    };
};


export type IgdbApi = Awaited<ReturnType<typeof createIgdbApi>>;
