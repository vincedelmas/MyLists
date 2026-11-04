import z from "zod";
import {clientEnv} from "@/env/client";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {dynamicListMediaFiltersSchema, dynamicListPreviewSchema, dynamicListSpecSchema} from "@/lib/schemas/dynamic-lists.schema";
import {getDynamicLists, getDynamicListEditorFilters, postCreateDynamicList, previewDynamicList} from "@/lib/server/functions/dynamic-lists";


export const registerDynamicListTools = ({ register }: ToolContext) => {
    register("dynamic_list_schema", {
        inputSchema: z.strictObject({}),
        description: "Read the JSON specification for saved dynamic lists and examples. Call before designing a dynamic list.",
    }, () => ({
        examples: DYNAMIC_LIST_PRESETS,
        schema: z.toJSONSchema(dynamicListSpecSchema, { io: "input" }),
        supportedMediaFilters: Object.fromEntries(ALL_MEDIA_TYPES.map(mediaType => [mediaType, Object.keys(dynamicListMediaFiltersSchema.shape[mediaType].unwrap().shape)])),
        rules: [
            "Only the connected user's active media lists are included; saved results refresh automatically.",
            "Filters combine with AND; statuses, genres and metadata values match any supplied value.",
            "Media-specific filters apply only to their type; movies.actors does not exclude books. Use supportedMediaFilters for valid keys.",
            "Use tag IDs from dynamic_list_filter_options and exact catalog names for genres and metadata.",
            "Preview before saving. Ask for clarification when a request cannot be expressed by this schema.",
        ],
    }));

    register("dynamic_list_filter_options", {
        inputSchema: dynamicListSpecSchema.pick({ mediaTypes: true }),
        description: "Read your available per-media filters, including stable tag IDs and their current names. Call before using tags in a dynamic list.",
    }, (data) => getDynamicListEditorFilters({ data }));

    register("preview_dynamic_list", {
        inputSchema: dynamicListPreviewSchema,
        description: "Validate and preview a dynamic list before saving: current matches, total count and paginated results. Does not save anything.",
    }, (data) => previewDynamicList({ data }));

    register("list_dynamic_lists", {
        inputSchema: z.strictObject({}),
        description: "List your saved dynamic lists and specifications. Check for existing dynamic lists before creating a duplicate.",
    }, async () => {
        return (await getDynamicLists()).map(list => ({
            ...list,
            url: new URL(`/lists/dynamic/${list.id}`, clientEnv.VITE_BASE_URL).href,
        }));
    });

    register("create_dynamic_list", {
        write: true,
        annotations: { idempotentHint: false },
        inputSchema: z.strictObject({ spec: dynamicListSpecSchema }),
        description: "Save a validated dynamic list for the connected user and return its page URL. Preview first. Saving does not modify media entries.",
    }, async ({ spec }) => {
        const { id } = await postCreateDynamicList({ data: spec });
        return { id, url: new URL(`/lists/dynamic/${id}`, clientEnv.VITE_BASE_URL).href };
    });
};
