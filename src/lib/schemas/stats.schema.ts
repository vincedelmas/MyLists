import * as z from "zod";
import {YEAR_RECAP_FIRST_YEAR} from "@/lib/types/year-recap.types";
import {mediaTypeFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export type StatsActiveTab = z.infer<typeof statsActiveTabField>;


const statsActiveTabField = z.union([mediaTypeFieldSchema, z.literal("overview")]).optional().default("overview").catch("overview");


export const statsActiveTabSchema = z.object({
    activeTab: statsActiveTabField,
    recap: z.coerce.number().int().min(YEAR_RECAP_FIRST_YEAR).optional().catch(undefined),
});


export const userStatsInputSchema = z.object({
    username: usernameFieldSchema,
    activeTab: statsActiveTabField,
});
