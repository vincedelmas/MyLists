import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


export type StatsActiveTab = z.infer<typeof statsActiveTabField>;


const statsActiveTabField = z.union([z.enum(MediaType), z.literal("overview")]).optional().default("overview").catch("overview");


export const statsActiveTabSchema = z.object({
    activeTab: statsActiveTabField,
});


export const userStatsInputSchema = z.object({
    username: z.string(),
    activeTab: statsActiveTabField,
});
