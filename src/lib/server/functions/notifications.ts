import {z} from "zod";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getNotifications = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ type: z.enum(["media", "social"]) }))
    .handler(async ({ data: { type }, context: { currentUser } }) => {
        const container = await getContainer();
        const notificationsService = container.services.notifications;
        return notificationsService.getLastNotifications(currentUser.id, type);
    });


export const getNotificationsCount = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        const notificationsService = container.services.notifications;
        return notificationsService.countUnreadNotifications(currentUser.id);
    });


export const markAllNotifAsRead = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ type: z.enum(["media", "social"]) }))
    .handler(async ({ data: { type }, context: { currentUser } }) => {
        const container = await getContainer();
        const notificationsService = container.services.notifications;
        return notificationsService.markAllAsRead(currentUser.id, type);
    });


export const postDeleteSocialNotif = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ notificationId: z.coerce.number().int().positive() }))
    .handler(async ({ data: { notificationId }, context: { currentUser } }) => {
        const container = await getContainer();
        const notificationsService = container.services.notifications;
        return notificationsService.deleteSocialNotif(currentUser.id, notificationId);
    });
