import * as z from "zod";
import { getContainer } from "@/lib/server/core/container";
import { dateFromUTCInput } from "@/lib/utils/formatting/date";
import { mobileImagePath } from "./images";

export const notificationTypeSchema = z.enum(["media", "social"]);
export const mobileNotificationActionSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("read"), type: notificationTypeSchema }),
    z.object({ action: z.literal("delete"), notificationId: z.number().int().positive() }),
]);
export async function getMobileNotificationCounts(userId: number) {
    const { services } = await getContainer();
    return services.notifications.countUnreadNotifications(userId);
}
export async function getMobileNotifications(userId: number, type: z.infer<typeof notificationTypeSchema>) {
    const { services } = await getContainer();
    const items = await services.notifications.getLastNotifications(userId, type, 30);
    return items.map((item) =>
        "actor" in item
            ? {
                  kind: "social" as const,
                  id: item.id,
                  read: item.read,
                  type: item.type,
                  createdAt: dateFromUTCInput(item.createdAt).toISOString(),
                  featureRequest: item.featureRequest,
                  actor: { ...item.actor, image: item.actor.image ? mobileImagePath(item.actor.image) : null },
              }
            : {
                  kind: "media" as const,
                  id: item.id,
                  read: item.read,
                  name: item.name,
                  mediaType: item.mediaType,
                  mediaId: item.mediaId,
                  season: item.season,
                  episode: item.episode,
                  isSeasonFinale: item.isSeasonFinale,
                  releaseDate: item.releaseDate,
                  createdAt: dateFromUTCInput(item.createdAt).toISOString(),
              },
    );
}
export async function actOnMobileNotification(userId: number, input: z.infer<typeof mobileNotificationActionSchema>) {
    const { services } = await getContainer();
    if (input.action === "read") await services.notifications.markAllAsRead(userId, input.type);
    else await services.notifications.deleteSocialNotif(userId, input.notificationId);
    return { kind: "saved" as const };
}
