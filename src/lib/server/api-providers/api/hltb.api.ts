import {closest} from "@/lib/utils/levenshtein";
import {RateLimiterAbstract} from "rate-limiter-flexible";
import {BaseApi} from "@/lib/server/api-providers/api/base.api";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {HltbApiResponse, HltbGameEntry} from "@/lib/types/provider.types";


export class HltbApi extends BaseApi {
    private static readonly consumeKey = "hltb-API";
    private static readonly baseUrl = "https://howlongtobeat.com/";
    private static searchUrl = HltbApi.baseUrl + "api/bleed"
    private static tokenUrl = HltbApi.baseUrl + "api/bleed/init";
    private static readonly throttleOptions = { points: 4, duration: 1, keyPrefix: "hltbAPI" };
    private static readonly userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/125.0.0.0 Safari/537.36";

    constructor(limiter: RateLimiterAbstract, consumeKey: string) {
        super(limiter, consumeKey);
    }

    public static async create() {
        const hltbLimiter = await createRateLimiter(HltbApi.throttleOptions);
        return new HltbApi(hltbLimiter, HltbApi.consumeKey);
    }

    async search(gameName: string) {
        const defaultEntry: HltbGameEntry = {
            name: gameName,
            mainStory: null,
            mainExtra: null,
            completionist: null,
        };

        try {
            const ua = HltbApi.userAgent;

            const htmlResult = await this._sendWebRequest(gameName, ua);
            if (!htmlResult) return defaultEntry;

            const gamesList = this._parseGameResults(htmlResult);
            if (gamesList.length === 0) return defaultEntry;

            const closestGameName = closest(gameName, gamesList.map((g) => g.name));
            const game = gamesList.find((g) => g.name === closestGameName);

            return game || defaultEntry;
        }
        catch (err) {
            console.error(`Error when searching for game ${gameName}:`, err);
            return defaultEntry;
        }
    }

    private _parseGameResults(htmlResult: string) {
        try {
            const response: HltbApiResponse = JSON.parse(htmlResult);
            return response.data
                .filter((game) => game.game_name)
                .map((game) => ({
                    name: game.game_name!,
                    mainStory: game.comp_main ? (game.comp_main / 3600).toFixed(2) : undefined,
                    mainExtra: game.comp_plus ? (game.comp_plus / 3600).toFixed(2) : undefined,
                    completionist: game.comp_100 ? (game.comp_100 / 3600).toFixed(2) : undefined,
                } as HltbGameEntry));
        }
        catch (err) {
            console.error("Error parsing game results:", err);
            return [];
        }
    }

    private async _sendWebRequest(gameName: string, ua: string) {
        const headers: Record<string, string> = {
            "accept": "*/*",
            "User-Agent": ua,
            "Origin": HltbApi.baseUrl,
            "Referer": HltbApi.baseUrl,
            "content-type": "application/json",
        };

        const authData = await this._getAuthToken(ua);

        if (authData) {
            headers["x-hp-key"] = authData.hpKey;
            headers["x-hp-val"] = authData.hpVal;
            headers["x-auth-token"] = authData.token;
        }

        try {
            const payload = this._createPayload(gameName, authData);
            const response = await this.call(HltbApi.searchUrl, "post", {
                headers,
                body: JSON.stringify(payload),
            });

            return await response.text();
        }
        catch (err) {
            console.warn("First request failed, trying alternative:", err);
        }
    }

    private async _getAuthToken(ua: string) {
        const headers = {
            "User-Agent": ua,
            "referer": HltbApi.baseUrl,
        };

        try {
            const response = await this.call(`${HltbApi.tokenUrl}?t=${Date.now()}`, "get", { headers });
            const data = await response.json();
            const token = data?.token ?? data?.data?.token;
            const hpKey = data?.hpKey ?? data?.data?.hpKey;
            const hpVal = data?.hpVal ?? data?.data?.hpVal;
            return { token: String(token), hpKey: String(hpKey), hpVal: String(hpVal) };
        }
        catch (err) {
            console.error("Error fetching auth token:", err);
        }
    }

    private _createPayload(gameName: string, authData?: { token: string, hpKey?: string, hpVal?: string }) {
        const payload: Record<string, any> = {
            size: 10,
            searchPage: 1,
            searchType: "games",
            searchTerms: gameName.split(" "),
            searchOptions: {
                games: {
                    userId: 0,
                    platform: "",
                    rangeCategory: "main",
                    sortCategory: "popular",
                    rangeTime: { min: 0, max: 0 },
                    rangeYear: { max: "", min: "" },
                    gameplay: {
                        flow: "",
                        genre: "",
                        difficulty: "",
                        perspective: "",
                    },
                },
                sort: 0,
                filter: "",
                randomizer: 0,
                lists: { sortCategory: "follows" },
                users: { sortCategory: "postcount" },
            },
            useCache: true,
        };

        if (authData?.hpKey && authData?.hpVal) {
            payload[authData.hpKey] = authData.hpVal;
        }

        return payload;
    }
}
