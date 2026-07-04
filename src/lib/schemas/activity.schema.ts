import z from "zod";
import {ActivityKind} from "@/lib/utils/enums";
import {calendarDateRangeToISOString} from "@/lib/utils/date-formatting";
import {coercedPositiveIntFieldSchema, mediaTypeFieldSchema, optionalSearchFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export type AddActivity = z.infer<typeof addActivitySchema>;
export type ActivitySearch = z.infer<typeof activitySearchSchema>;
export type UpdateActivity = z.infer<typeof updateActivityPayloadSchema>;
export type MonthlyActivityFilters = z.infer<typeof monthlyActivitySchema>;
export type BulkHideActivityInput = z.input<typeof bulkHideActivitySchema>;
export type MonthlyActivityStatsFilters = z.infer<typeof monthlyActivityStatsSchema>;


export const activitySearchSchema = z.object({
    year: z.preprocess((val) => {
        const year = Number(val);
        return Number.isInteger(year) && year > 0 ? String(year) : String(new Date().getFullYear());
    }, z.string()),
    month: z.preprocess((val) => {
        const month = Number(val);
        return Number.isInteger(month) && month >= 1 && month <= 12 ? String(month) : String(new Date().getMonth() + 1);
    }, z.string()),
    search: optionalSearchFieldSchema,
    page: coercedPositiveIntFieldSchema.optional().default(1),
    activityKind: z.enum(ActivityKind).optional().default(ActivityKind.ALL).catch(ActivityKind.ALL),
    activeTab: z.union([mediaTypeFieldSchema, z.literal("all")]).optional().default("all").catch("all"),
    hiddenOnly: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
});

export const monthlyActivitySchema = z.object({
    username: usernameFieldSchema,
    search: optionalSearchFieldSchema,
    year: coercedPositiveIntFieldSchema,
    hiddenOnly: z.coerce.boolean().optional().default(false),
    page: coercedPositiveIntFieldSchema.optional().default(1),
    month: coercedPositiveIntFieldSchema.min(1).max(12),
    activityKind: z.enum(ActivityKind).optional().default(ActivityKind.ALL),
    activeTab: z.union([mediaTypeFieldSchema, z.literal("all")]).optional().default("all"),
});

export const monthlyActivityStatsSchema = monthlyActivitySchema.pick({
    year: true,
    month: true,
    username: true,
}).extend({
    mediaType: mediaTypeFieldSchema.optional(),
});

export const activityAddMediaSearchSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    query: z.string().trim().min(2),
});

export const updateActivityFormSchema = z.object({
    isRedo: z.boolean(),
    hidden: z.boolean(),
    lastUpdate: z.string(),
    isCompleted: z.boolean(),
    specificGained: z.number().min(0, "Progress must be 0 or more."),
});

export const updateActivityPayloadSchema = updateActivityFormSchema.partial()
    .refine((data) => Object.values(data).some((val) => val !== undefined), {
        message: "Provide at least one field to update.", path: ["lastUpdate"],
    });

export const updateActivitySchema = z.object({
    payload: updateActivityPayloadSchema,
    activityId: coercedPositiveIntFieldSchema,
});

export const addActivitySchema = z.object({
    mediaType: mediaTypeFieldSchema,
    hidden: z.boolean().optional().default(false),
    isRedo: z.boolean().optional().default(false),
    isCompleted: z.boolean().optional().default(false),
    mediaId: z.number().int().positive("Choose a media first."),
    lastUpdate: z.string().min(1, "Progress date is required."),
    specificGained: z.number().positive("Progress must be greater than 0."),
});

export const addActivityFormSchema = addActivitySchema.extend({
    hidden: z.boolean(),
    isRedo: z.boolean(),
    isCompleted: z.boolean(),
});

export const bulkHideActivitySchema = z.object({
    endDate: z.string().trim().pipe(z.iso.date()),
    startDate: z.string().trim().pipe(z.iso.date()),
    mediaType: z.union([z.literal("all"), mediaTypeFieldSchema]).optional()
        .transform((mediaType) => mediaType === "all" ? undefined : mediaType),
}).refine((data) => calendarDateRangeToISOString(data.startDate, data.endDate) !== null, {
    message: "Start date must be before end date.", path: ["endDate"],
});

export const deleteActivitySchema = z.object({
    activityId: coercedPositiveIntFieldSchema,
});
