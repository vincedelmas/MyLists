import z from "zod";
import {clientEnv} from "@/env/client";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {dynamicListPreviewSchema, dynamicListSpecSchema} from "@/lib/schemas/dynamic-lists.schema";
import {getDynamicLists, postCreateDynamicList, previewDynamicList} from "@/lib/server/functions/dynamic-lists";


export const registerDynamicListTools = ({ register }: ToolContext) => {
    register("dynamic_list_schema", {
        inputSchema: z.strictObject({}),
        description: "Read the JSON specification for saved dynamic lists and examples. Call before designing a dynamic list.",
    }, () => ({
        examples: DYNAMIC_LIST_PRESETS,
        schema: z.toJSONSchema(dynamicListSpecSchema, { io: "input" }),
        supportedMediaFilters: Object.fromEntries(ALL_MEDIA_TYPES.map(mediaType => [mediaType, Object.keys(getMediaDefinition(mediaType).filters.metadata)])),
        rules: [
            "Dynamic lists include only the connected user's active media lists. All filters are combined with AND; statuses and genres match any supplied value.",
            "mediaFilters groups metadata rules by media type. Each group applies only to that type: movies.actors does not exclude books from a mixed list. Use supportedMediaFilters to choose valid keys for each type; values match any supplied name.",
            "Metadata names use exact catalog values. For series and anime, langs contains origin-country codes. Games platforms filter the user's tracked platform, not catalog availability.",
            "planned groups Plan to Watch, Plan to Play and Plan to Read. in_progress groups Watching, Playing and Reading.",
            "search is a case-insensitive literal substring of the catalog title; percent signs and underscores are not wildcards.",
            "addedBefore.monthsAgo and updatedBefore.monthsAgo match dates older than a rolling UTC calendar-month cutoff, with month ends clamped. addedWithin.monthsAgo matches added dates at or after that cutoff. Unknown dates are excluded.",
            "Age uses the date an entry was added, not how long it has continuously held its current status.",
            "Ratings use the user's 0–10 scores; rated checks whether a score is set, including zero. hasComment checks for nonblank user comments. Release-year bounds are inclusive and exclude unknown release dates.",
            "Tags match any supplied name by default, or every name with tagsMatch: all. excludeTags removes entries with any of those tags. Tags are always scoped to the connected user; genres use exact catalog names.",
            "Saved lists refresh from current data without another model call.",
            "Preview the specification before saving. Unsupported requests require clarification; use only fields defined in this schema.",
        ],
    }));

    register("preview_dynamic_list", {
        inputSchema: dynamicListPreviewSchema,
        description: "Validate and preview a dynamic list before saving: current matches, total count and paginated results. Does not save anything.",
    }, data => previewDynamicList({ data }));

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
