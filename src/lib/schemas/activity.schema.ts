import * as z from "zod";
import {ActivityKind} from "@/lib/utils/enums";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {isValidActivityDate} from "@/lib/utils/activity-utils";
import {calendarDateRangeToISOString} from "@/lib/utils/date-formatting";
import {coercedPositiveIntFieldSchema, mediaTypeFieldSchema, optionalSearchFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export type BulkHideActivity = z.infer<typeof bulkHideActivitySchema>;
export type AddMonthlyActivity = z.infer<typeof addMonthlyActivitySchema>;
export type BulkHideActivityInput = z.input<typeof bulkHideActivitySchema>;
export type MonthlyActivityFilters = z.infer<typeof monthlyActivitySchema>;
export type AddMonthlyActivityInput = z.input<typeof addMonthlyActivitySchema>;
export type MonthlyActivitySearch = z.infer<typeof monthlyActivitySearchSchema>;
export type MonthlyActivityFields = z.infer<typeof monthlyActivityFieldsSchema>;
export type MonthlyActivityFieldsInput = z.input<typeof monthlyActivityFieldsSchema>;
export type MonthlyActivityStatsFilters = z.infer<typeof monthlyActivityStatsSchema>;
export type UpdateMonthlyActivity = z.infer<typeof updateMonthlyActivityPayloadSchema>;


export const monthlyActivitySearchSchema = z.object({
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

export const monthlyActivityMediaSearchSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    query: z.string().trim().min(2),
});

export const monthlyActivityFieldsSchema = z.object({
    hidden: z.boolean(),
    hadCompletion: z.boolean(),
    progressGained: z.number().min(0, "Progress must be 0 or more."),
    redoGained: z.number().int("Redo must be a whole number.").min(0, "Redo must be 0 or more."),
    lastActivityAt: z.string().refine(isValidActivityDate, `Date must be between ${MIN_ACTIVITY_DATE} and today.`),
});

const updateMonthlyActivityPayloadSchema = monthlyActivityFieldsSchema
    .partial()
    .refine((data) => Object.values(data).some((val) => val !== undefined), {
        message: "Provide at least one field to update.", path: ["lastActivityAt"],
    });

export const updateMonthlyActivitySchema = z.object({
    activityId: coercedPositiveIntFieldSchema,
    payload: updateMonthlyActivityPayloadSchema,
});

export const addMonthlyActivitySchema = monthlyActivityFieldsSchema.extend({
    mediaType: mediaTypeFieldSchema,
    mediaId: z.coerce.number().int().positive("Choose a media first."),
}).refine((data) => data.progressGained > 0 || data.hadCompletion || data.redoGained > 0, {
    message: "Add progress, a completion, or at least one redo.",
    path: ["progressGained"],
});

export const bulkHideActivitySchema = z.object({
    endDate: z.string().trim().pipe(z.iso.date()),
    startDate: z.string().trim().pipe(z.iso.date()),
    mediaType: z.union([mediaTypeFieldSchema, z.literal("all")]).optional()
        .transform((mediaType) => mediaType === "all" ? undefined : mediaType),
}).refine((data) => calendarDateRangeToISOString(data.startDate, data.endDate) !== null, {
    message: "Start date must be before end date.", path: ["endDate"],
});

export const removeMonthlyActivitySchema = z.object({
    activityId: coercedPositiveIntFieldSchema,
});
