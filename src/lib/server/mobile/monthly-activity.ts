import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {
    addMonthlyActivitySchema, monthlyActivityMediaSearchSchema, monthlyActivitySchema,
    monthlyActivitySearchSchema, monthlyActivityStatsSchema, removeMonthlyActivitySchema, updateMonthlyActivitySchema,
} from "@/lib/schemas/activity.schema";
import {mobileImagePath} from "./images";

export const mobileMonthlyActivitySchema = monthlyActivitySchema.omit({ username: true }).extend({ hiddenOnly: monthlyActivitySearchSchema.shape.hiddenOnly });
export const mobileMonthlyActivityStatsSchema = monthlyActivityStatsSchema.omit({ username: true });
export const mobileMonthlyActivityMutationSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("add"), data: addMonthlyActivitySchema }),
    updateMonthlyActivitySchema.extend({ action: z.literal("update") }),
    removeMonthlyActivitySchema.extend({ action: z.literal("remove") }),
]);

export async function getMobileMonthlyActivity(userId: number, filters: z.infer<typeof mobileMonthlyActivitySchema>, viewerId = userId) {
    const canEdit = userId === viewerId;
    if (filters.hiddenOnly && !canEdit) throw new UnauthorizedError("private");
    const { services } = await getContainer();
    const [result, settings] = await Promise.all([
        services.activity.getMonthlyActivity(userId, filters, canEdit),
        services.account.getMinimalUserSettings(userId),
    ]);
    return {
        ...result,
        canEdit,
        activeMediaTypes: ALL_MEDIA_TYPES.filter(type => settings.some(setting => setting.mediaType === type && setting.active)),
        items: result.items.map(item => ({ ...item, mediaCover: mobileImagePath(item.mediaCover) })),
    };
}

export async function getMobileMonthlyActivityStats(userId: number, filters: z.infer<typeof mobileMonthlyActivityStatsSchema>) {
    const { services } = await getContainer();
    const result = await services.activity.getMonthlyActivityStats(userId, filters);
    return { ...result, mediaStats: result.mediaStats.sort((a, b) => ALL_MEDIA_TYPES.indexOf(a.mediaType) - ALL_MEDIA_TYPES.indexOf(b.mediaType)) };
}

export async function searchMobileActivityMedia(userId: number, input: z.infer<typeof monthlyActivityMediaSearchSchema>) {
    const { registries } = await getContainer();
    const items = await registries.mediaMonthlyActivity.get(input.mediaType).searchUserMedia(userId, input.query.trim(), 20);
    return items.map(item => ({ mediaId: item.mediaId, mediaName: item.mediaName, cover: mobileImagePath(item.customCover ?? item.mediaCover) }));
}

export async function mutateMobileMonthlyActivity(userId: number, input: z.infer<typeof mobileMonthlyActivityMutationSchema>) {
    const { services } = await getContainer();
    if (input.action === "add") services.activity.addMonthlyActivity(userId, input.data);
    else if (input.action === "update") services.activity.updateMonthlyActivity(userId, input.activityId, input.payload);
    else services.activity.removeFromMonth(userId, input.activityId);
    return { saved: true };
}
