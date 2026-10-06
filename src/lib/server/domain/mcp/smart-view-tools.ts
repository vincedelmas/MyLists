import z from "zod";
import {clientEnv} from "@/env/client";
import {SMART_VIEW_PRESETS} from "@/lib/utils/smart-views/presets";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {smartViewPreviewSchema, smartViewSpecSchema} from "@/lib/schemas/smart-views.schema";
import {getSmartViews, postCreateSmartView, previewSmartView} from "@/lib/server/functions/smart-views";


export const registerSmartViewTools = ({ register }: ToolContext) => {
    register("smart_view_schema", {
        inputSchema: z.strictObject({}),
        description: "Read the JSON specification for saved smart lists and examples. Call before designing a view.",
    }, () => ({
        examples: SMART_VIEW_PRESETS,
        schema: z.toJSONSchema(smartViewSpecSchema, { io: "input" }),
        rules: [
            "Views include only the connected user's active media lists. All filters are combined with AND; statuses and genres match any supplied value.",
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

    register("preview_smart_view", {
        inputSchema: smartViewPreviewSchema,
        description: "Validate and preview a smart list before saving: current matches, total count and paginated results. Does not save anything.",
    }, data => previewSmartView({ data }));

    register("list_smart_views", {
        inputSchema: z.strictObject({}),
        description: "List your saved smart lists and specifications. Check for existing views before creating a duplicate.",
    }, async () => {
        return (await getSmartViews()).map(view => ({
            ...view,
            url: new URL(`/smart-views/${view.id}`, clientEnv.VITE_BASE_URL).href,
        }))
    });

    register("create_smart_view", {
        write: true,
        annotations: { idempotentHint: false },
        inputSchema: z.strictObject({ spec: smartViewSpecSchema }),
        description: "Save a validated smart list for the connected user and return its page URL. Preview first. Saving does not modify media entries.",
    }, async ({ spec }) => {
        const { id } = await postCreateSmartView({ data: spec });
        return { id, url: new URL(`/smart-views/${id}`, clientEnv.VITE_BASE_URL).href };
    });
};
