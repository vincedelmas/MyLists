import {eq} from "drizzle-orm";
import {serverEnv} from "@/env/server";
import {notFound} from "@tanstack/react-router";
import {ApiProviderType} from "@/lib/utils/enums";
import {apiTokens} from "@/lib/server/database/schema";
import {GameAdvancedSearchFilters} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";
import {
    GameAdvancedSearchOptions,
    IdNamePair,
    IgdbGameCollectionIds,
    IgdbGameDetails,
    IgdbPopularityPrimitive,
    IgdbSearchResponse,
    IgdbSearchResultItem,
    IgdbTokenResponse,
    IgdbTrendingGame,
    SearchData
} from "@/lib/types/provider.types";


type IgdbApiConfig = ApiClientConfig & {
    baseUrl: string;
    genresUrl: string;
    platformsUrl: string;
    tokenCacheKey: string;
    multiQueryUrl: string;
    tokenCacheExpiryMs: number;
};


const MAX_SEARCH_QUERY_LENGTH = 100;
const IGDB_QUERY_LIMIT = 500;
const TRENDING_GAMES_LIMIT = 15;
const TRENDING_GAME_TYPE_IDS = [0, 8] as const; // Main Game and Remake
const TRENDING_RELEASE_WINDOW_SECONDS = 90 * 24 * 60 * 60; // 90 days
const TRENDING_POPULARITY_TYPE_IDS = [1, 2, 3, 4] as const; // Visits and IGDB list additions


const createConfig = (): IgdbApiConfig => ({
    resultsPerPage: 20,
    consumeKey: "igdb-API",
    tokenCacheKey: "igdb:accessToken",
    tokenCacheExpiryMs: 24 * 60 * 60 * 1000,
    baseUrl: "https://api.igdb.com/v4/games",
    genresUrl: "https://api.igdb.com/v4/genres",
    platformsUrl: "https://api.igdb.com/v4/platforms",
    multiQueryUrl: "https://api.igdb.com/v4/multiquery",
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
        async search(query: string, page: number = 1, advancedFilters?: GameAdvancedSearchFilters): Promise<SearchData<IgdbSearchResponse>> {
            const offset = (page - 1) * resultsPerPage;
            const sanitizedQuery = sanitizeSearchQuery(query);
            const whereClauses = buildAdvancedWhereClauses(advancedFilters);

            if (sanitizedQuery.length < 2 && whereClauses.length === 1) {
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
                    ${escapedQuery ? `search "${escapedQuery}";` : ""}
                    where ${whereClauses.join(" & ")};
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

        async getAdvancedSearchOptions(): Promise<GameAdvancedSearchOptions> {
            const headers = await getHeaders();

            const fetchAllOptions = async (url: string) => {
                const pageSize = 500;
                const options: IdNamePair[] = [];

                while (true) {
                    const response = await http.call(url, "post", {
                        headers,
                        body: `fields id, name; sort name asc; limit ${pageSize}; offset ${options.length};`,
                    });

                    const page = await response.json() as IdNamePair[];
                    options.push(...page);

                    if (page.length < pageSize) return options;
                }
            };

            const [genres, platforms] = await Promise.all([
                fetchAllOptions(config.genresUrl),
                fetchAllOptions(config.platformsUrl),
            ]);

            return {
                genres: genres.filter((option) => option.name?.trim()),
                platforms: platforms.filter((option) => option.name?.trim()),
            };
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

        async getTrendingGames(): Promise<IgdbTrendingGame[]> {
            const headers = await getHeaders();
            const popularityQuery = TRENDING_POPULARITY_TYPE_IDS.map((popularityType) => `
                query popularity_primitives "type-${popularityType}" {
                    fields game_id, value, popularity_type;
                    where popularity_type = ${popularityType};
                    sort value desc;
                    limit ${IGDB_QUERY_LIMIT};
                };
            `).join("\n");

            const popularityResponse = await http.call(config.multiQueryUrl, "post", {
                headers,
                body: popularityQuery,
            });

            const candidateScores = new Map<number, number>();
            const popularityGroups = await popularityResponse.json() as { result: IgdbPopularityPrimitive[] }[];

            for (const group of popularityGroups) {
                for (const prim of group.result) {
                    if (!prim.game_id) continue;
                    candidateScores.set(prim.game_id, (candidateScores.get(prim.game_id) ?? 0) + prim.value);
                }
            }

            const candidateIds = [...candidateScores.entries()]
                .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                .map(([gameId]) => gameId);

            if (candidateIds.length === 0) return [];

            const nowTimestamp = Math.floor(Date.now() / 1000);
            const releasedAfterTimestamp = nowTimestamp - TRENDING_RELEASE_WINDOW_SECONDS;
            const gamesQuery: string[] = [];

            for (let offset = 0; offset < candidateIds.length; offset += IGDB_QUERY_LIMIT) {
                const ids = candidateIds.slice(offset, offset + IGDB_QUERY_LIMIT);
                gamesQuery.push(`
                    query games "candidates-${offset / IGDB_QUERY_LIMIT}" {
                        fields name, summary, cover.image_id, first_release_date;
                        where id = (${ids.join(",")})
                            & first_release_date >= ${releasedAfterTimestamp}
                            & first_release_date <= ${nowTimestamp}
                            & game_type = (${TRENDING_GAME_TYPE_IDS.join(",")})
                            & cover != null
                            & videos != null;
                        limit ${IGDB_QUERY_LIMIT};
                    };
                `);
            }

            const gamesResponse = await http.call(config.multiQueryUrl, "post", {
                headers,
                body: gamesQuery.join("\n"),
            });

            const gameGroups = await gamesResponse.json() as { result: IgdbTrendingGame[] }[];
            return gameGroups
                .flatMap((group) => group.result)
                .sort((gameA, gameB) => candidateScores.get(gameB.id)! - candidateScores.get(gameA.id)!)
                .slice(0, TRENDING_GAMES_LIMIT);
        },

        refreshAccessToken,

        fetchNewIgdbToken,
    };
};


const buildAdvancedWhereClauses = (filters?: GameAdvancedSearchFilters) => {
    const startOfYearTimestamp = (year: number) => {
        return Math.floor(Date.UTC(year, 0, 1) / 1000);
    }

    const clauses = ["version_parent = null"];
    if (!filters) return clauses;

    if (filters.genreId) clauses.push(`genres = (${filters.genreId})`);
    if (filters.platformId) clauses.push(`platforms = (${filters.platformId})`);
    if (filters.minimumRating !== undefined) clauses.push(`total_rating >= ${filters.minimumRating}`);
    if (filters.releaseYearTo) clauses.push(`first_release_date < ${startOfYearTimestamp(filters.releaseYearTo + 1)}`);
    if (filters.releaseYearFrom) clauses.push(`first_release_date >= ${startOfYearTimestamp(filters.releaseYearFrom)}`);

    return clauses;
};


export type IgdbApi = Awaited<ReturnType<typeof createIgdbApi>>;
