import * as z from "zod";
import {mediaTypeFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export type StatsActiveTab = z.infer<typeof statsActiveTabField>;


const statsActiveTabField = z.union([mediaTypeFieldSchema, z.literal("overview")]).optional().default("overview").catch("overview");


export const statsActiveTabSchema = z.object({
    activeTab: statsActiveTabField,
});


export const userStatsInputSchema = z.object({
    username: usernameFieldSchema,
    activeTab: statsActiveTabField,
});
