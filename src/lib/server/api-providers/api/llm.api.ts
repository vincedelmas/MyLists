import z from "zod";
import {serverEnv} from "@/env/server";
import {LLMResponse} from "@/lib/types/provider.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";


type LlmApiConfig = ApiClientConfig;


const createConfig = (): LlmApiConfig => ({
    consumeKey: "llm-API",
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
            if (!serverEnv.LLM_API_KEY) {
                throw new FormattedError("Book genre enrichment is unavailable because the LLM integration is not configured.");
            }

            const response = await http.call(`${serverEnv.LLM_BASE_URL}/chat/completions`, "post", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${serverEnv.LLM_API_KEY}`,
                },
                body: JSON.stringify({
                    model: serverEnv.LLM_MODEL_ID,
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
