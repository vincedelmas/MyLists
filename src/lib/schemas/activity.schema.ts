import z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {calendarDateRangeToISOString} from "@/lib/utils/date-formatting";


export type AddActivity = z.infer<typeof addActivitySchema>;
export type MonthlyActivityFilters = z.infer<typeof monthlyActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>["payload"];
export type MonthlyActivityStatsFilters = z.infer<typeof monthlyActivityStatsSchema>;


export const monthlyActivitySchema = z.object({
    username: z.string(),
    year: z.coerce.number().int().positive(),
    search: z.string().optional().catch(undefined),
    hiddenOnly: z.coerce.boolean().optional().default(false),
    page: z.coerce.number().int().positive().optional().default(1),
    month: z.coerce.number().int().positive().min(1).max(12),
    activeTab: z.union([z.enum(MediaType), z.literal("all")]).optional().default("all"),
    activityKind: z.enum(["all", "completed", "progressed", "redo"]).optional().default("all"),
});

export const monthlyActivityStatsSchema = monthlyActivitySchema.pick({
    year: true,
    month: true,
    username: true,
}).extend({
    mediaType: z.enum(MediaType).optional(),
});

export const activityAddMediaSearchSchema = z.object({
    mediaType: z.enum(MediaType),
    query: z.string().trim().min(2),
});

export const updateActivitySchema = z.object({
    activityId: z.coerce.number().int().positive(),
    payload: z.object({
        isRedo: z.boolean().optional(),
        hidden: z.boolean().optional(),
        lastUpdate: z.string().optional(),
        isCompleted: z.boolean().optional(),
        specificGained: z.number().min(0).optional(),
    }).refine((data) => Object.values(data).some((val) => val !== undefined), {
        message: "Provide at least one field to update.", path: ["lastUpdate"],
    }),
});

export const addActivitySchema = z.object({
    lastUpdate: z.string(),
    mediaType: z.enum(MediaType),
    specificGained: z.number().min(0),
    mediaId: z.coerce.number().int().positive(),
    hidden: z.boolean().optional().default(false),
    isRedo: z.boolean().optional().default(false),
    isCompleted: z.boolean().optional().default(false),
}).refine((data) => data.specificGained > 0 || data.isCompleted || data.isRedo, {
    message: "Activity must have progress, completion, or redo.", path: ["specificGained"],
});

export const bulkHideActivitySchema = z.object({
    endDate: z.string().trim().pipe(z.iso.date()),
    startDate: z.string().trim().pipe(z.iso.date()),
    mediaType: z.enum(MediaType).optional(),
}).refine((data) => calendarDateRangeToISOString(data.startDate, data.endDate) !== null, {
    message: "Start date must be before end date.", path: ["endDate"],
});

export const deleteActivitySchema = z.object({
    activityId: z.coerce.number().int().positive(),
});
