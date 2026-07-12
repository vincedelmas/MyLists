import {closest} from "@/lib/utils/levenshtein";
import {HltbApiResponse, HltbGameEntry} from "@/lib/types/provider.types";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";


type HltbApiConfig = ApiClientConfig & {
    baseUrl: string;
    tokenUrl: string;
    searchUrl: string;
    userAgent: string;
};

type HltbAuthData = {
    token: string;
    hpKey: string;
    hpVal: string;
};


const createConfig = (): HltbApiConfig => {
    const baseUrl = "https://howlongtobeat.com/";
    return {
        baseUrl,
        consumeKey: "hltb-API",
        searchUrl: baseUrl + "api/bleed",
        tokenUrl: baseUrl + "api/bleed/init",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        throttleOptions: [{
            points: 4,
            duration: 1,
            keyPrefix: "hltbAPI",
        }],
    };
};


export const createHltbApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);

    async function sendWebRequest(gameName: string) {
        const headers: Record<string, string> = {
            "accept": "*/*",
            "Origin": config.baseUrl,
            "Referer": config.baseUrl,
            "User-Agent": config.userAgent,
            "content-type": "application/json",
        };

        const authData = await getAuthToken();

        if (authData) {
            headers["x-hp-key"] = authData.hpKey;
            headers["x-hp-val"] = authData.hpVal;
            headers["x-auth-token"] = authData.token;
        }

        try {
            const payload = createPayload(gameName, authData);
            const response = await http.call(config.searchUrl, "post", {
                headers,
                body: JSON.stringify(payload),
            });

            return await response.text();
        }
        catch (err) {
            console.warn("First request failed, trying alternative:", err);
        }
    }

    async function getAuthToken() {
        const headers = {
            "referer": config.baseUrl,
            "User-Agent": config.userAgent,
        };

        try {
            const response = await http.call(`${config.tokenUrl}?t=${Date.now()}`, "get", { headers });
            const data = await response.json();
            const token = data?.token ?? data?.data?.token;
            const hpKey = data?.hpKey ?? data?.data?.hpKey;
            const hpVal = data?.hpVal ?? data?.data?.hpVal;
            return {
                token: String(token),
                hpKey: String(hpKey),
                hpVal: String(hpVal),
            };
        }
        catch (err) {
            console.error("Error fetching auth token:", err);
        }
    }

    return {
        async search(gameName: string) {
            const defaultEntry: HltbGameEntry = {
                name: gameName,
                mainStory: null,
                mainExtra: null,
                completionist: null,
            };

            try {
                const htmlResult = await sendWebRequest(gameName);
                if (!htmlResult) return defaultEntry;

                const gamesList = parseGameResults(htmlResult);
                if (gamesList.length === 0) return defaultEntry;

                const closestGameName = closest(gameName, gamesList.map((g) => g.name));
                const game = gamesList.find((g) => g.name === closestGameName);

                return game || defaultEntry;
            }
            catch (err) {
                console.error(`Error when searching for game ${gameName}:`, err);
                return defaultEntry;
            }
        },
    };
};


function parseGameResults(htmlResult: string) {
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

function createPayload(gameName: string, authData?: HltbAuthData) {
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

    if (authData?.hpKey && authData.hpVal) {
        payload[authData.hpKey] = authData.hpVal;
    }

    return payload;
}


export type HltbApi = Awaited<ReturnType<typeof createHltbApi>>;
