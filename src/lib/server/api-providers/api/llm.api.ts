import z from "zod";
import {serverEnv} from "@/env/server";
import {LLMResponse} from "@/lib/types/provider.types";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";


type LlmApiConfig = ApiClientConfig & {
    apiKey: string;
    baseUrl: string;
    modelId: string;
};


const createConfig = (): LlmApiConfig => ({
    consumeKey: "llm-API",
    apiKey: serverEnv.LLM_API_KEY,
    baseUrl: serverEnv.LLM_BASE_URL,
    modelId: serverEnv.LLM_MODEL_ID,
    throttleOptions: [{
        points: 5,
        duration: 1,
        keyPrefix: "llmAPI",
    }],
});


export const createLlmApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);

    return {
        async llmBookGenresCall(content: string, schema: z.Schema): Promise<LLMResponse> {
            const response = await http.call(`${config.baseUrl}/chat/completions`, "post", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.modelId,
                    messages: [{ role: "user", content: content }],
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            strict: true,
                            name: "bookGenres",
                            schema: z.toJSONSchema(schema),
                        }
                    }
                }),
            });
            return response.json();
        },
    };
};
