import {eq} from "drizzle-orm";
import {serverEnv} from "@/env/server";
import {notFound} from "@tanstack/react-router";
import {ApiProviderType} from "@/lib/utils/enums";
import {apiTokens} from "@/lib/server/database/schema";
import {getContainer} from "@/lib/server/core/container";
import {RateLimiterAbstract} from "rate-limiter-flexible";
import {getDbClient} from "@/lib/server/database/async-storage";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {BaseApi} from "@/lib/server/api-providers/api/base.api";
import {IgdbGameCollectionIds, IgdbGameDetails, IgdbSearchResponse, IgdbSearchResultItem, IgdbTokenResponse, IgdbTrendGamesResponse, SearchData} from "@/lib/types/provider.types";


export class IgdbApi extends BaseApi {
    private static readonly consumeKey = "igdb-API";
    private static readonly maxSearchQueryLength = 100;
    private readonly clientId = serverEnv.IGDB_CLIENT_ID;
    private readonly secretId = serverEnv.IGDB_CLIENT_SECRET;
    private static readonly tokenCacheKey = "igdb:accessToken";
    private readonly baseUrl = "https://api.igdb.com/v4/games";
    private readonly externalGamesUrl = "https://api.igdb.com/v4/external_games";
    private static readonly tokenCacheExpiryMs = 24 * 60 * 60 * 1000; // 1 day in ms
    private readonly trendingUrl = "https://trendingnow.games/api/public/feeds/trending";
    private static readonly throttleOptions = { points: 3, duration: 1, keyPrefix: "igdbAPI" };

    constructor(limiter: RateLimiterAbstract, consumeKey: string) {
        super(limiter, consumeKey);
    }

    public static async create() {
        const igdbLimiter = await createRateLimiter(IgdbApi.throttleOptions);
        return new IgdbApi(igdbLimiter, IgdbApi.consumeKey);
    }

    async search(query: string, page: number = 1): Promise<SearchData<IgdbSearchResponse>> {
        const offset = (page - 1) * this.resultsPerPage;
        const sanitizedQuery = this._sanitizeSearchQuery(query);

        if (sanitizedQuery.length < 2) {
            return {
                page,
                rawData: { count: 0, result: [] },
                resultsPerPage: this.resultsPerPage,
            };
        }

        const escapedQuery = sanitizedQuery.replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .trim();

        const headers = await this._getHeaders();
        const response = await this.call(this.baseUrl, "post", {
            headers,
            body: `
                fields id, name, cover.image_id, first_release_date;
                search "${escapedQuery}";
                where version_parent = null;
                limit ${this.resultsPerPage + 1};
                offset ${offset};
            `,
        });

        const rawResults = await response.json() as IgdbSearchResultItem[];

        const result = rawResults.slice(0, this.resultsPerPage);
        const count = offset + result.length + (rawResults.length > this.resultsPerPage ? 1 : 0);

        return {
            page,
            rawData: { count, result },
            resultsPerPage: this.resultsPerPage,
        }
    }

    private _sanitizeSearchQuery(query: string) {
        return query
            .replace(/\s+/g, " ")
            .replace(/[;{}]/g, "")
            .trim()
            .slice(0, IgdbApi.maxSearchQueryLength);
    }

    async getGameDetails(apiId: number): Promise<IgdbGameDetails> {
        const body = `
            fields name, cover.image_id, game_engines.name, game_modes.name, platforms.name, genres.name, 
            player_perspectives.name, total_rating, total_rating_count, first_release_date, 
            involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
            summary, themes.name, collections, url, external_games.uid, external_games.external_game_source;
            where id = ${apiId};
        `;

        const headers = await this._getHeaders();
        const response = await this.call(`${this.baseUrl}`, "post", { headers, body });

        const rawData = await response.json() as IgdbGameDetails[];
        if (rawData.length === 0) throw notFound();

        return rawData[0];
    }

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

        const headers = await this._getHeaders();
        const response = await this.call(this.baseUrl, "post", { headers, body });
        return await response.json() as Promise<IgdbGameDetails[]>;
    }

    // TODO: to remove after backfilling
    async getGamesCollectionIds(apiIds: number[]): Promise<IgdbGameCollectionIds[]> {
        if (apiIds.length === 0) return [];

        const body = `fields id, collections; where id = (${apiIds.join(",")}); limit ${apiIds.length};`;

        const headers = await this._getHeaders();
        const response = await this.call(this.baseUrl, "post", { headers, body });

        return await response.json() as IgdbGameCollectionIds[];
    }

    async getTrendingGames(): Promise<IgdbTrendGamesResponse[]> {
        const trendRes = await this.call(this.trendingUrl);
        const trendsData = await trendRes.json() as { games: { steam_appid: number }[] };
        const steamIds = trendsData.games.map((game) => game.steam_appid);

        const body = `
            fields uid, game.name, game.summary, game.cover.image_id, game.first_release_date;
            where external_game_source = 1 & uid = (${steamIds.join(",")});
            limit ${steamIds.length};
        `;

        const headers = await this._getHeaders();
        const response = await this.call(this.externalGamesUrl, "post", { headers, body });
        const igdbResults = await response.json() as IgdbTrendGamesResponse[];

        const resultsMap = new Map(igdbResults.map((item) => [Number(item.uid), item]));

        return steamIds
            .map((id) => resultsMap.get(id))
            .filter((game): game is IgdbTrendGamesResponse => !!game);
    }

    async refreshAccessToken() {
        const tokenResponse = await this.fetchNewIgdbToken();

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
        const ttlMs = Math.max(expiresAt.getTime() - Date.now() - IgdbApi.tokenCacheExpiryMs, 0);
        if (ttlMs > 0) {
            await cacheStore.set(IgdbApi.tokenCacheKey, accessToken, ttlMs);
        }

        return accessToken;
    }

    async fetchNewIgdbToken(): Promise<IgdbTokenResponse> {
        const url = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.secretId}&grant_type=client_credentials`;
        const response = await this.call(url, "post");
        return response.json();
    }

    private async _getHeaders() {
        const accessToken = await this._getAccessToken();

        return {
            "Client-ID": this.clientId,
            "Accept": "application/json",
            "Content-Type": "text/plain",
            "Authorization": `Bearer ${accessToken}`,
        };
    }

    private async _getAccessToken() {
        const cacheStore = await getContainer().then((c) => c.cacheManager);

        const cachedToken = await cacheStore.get<string>(IgdbApi.tokenCacheKey);
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
            if (msLeft > IgdbApi.tokenCacheExpiryMs) {
                const ttlMs = Math.max(msLeft - IgdbApi.tokenCacheExpiryMs, 0);
                if (ttlMs > 0) {
                    await cacheStore.set(IgdbApi.tokenCacheKey, existingToken.accessToken, ttlMs);
                }

                return existingToken.accessToken;
            }
        }

        return this.refreshAccessToken();
    }
}
