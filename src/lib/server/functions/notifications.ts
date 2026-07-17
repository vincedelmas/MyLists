import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {notificationIdSchema, notificationSchema} from "@/lib/schemas";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getNotifications = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(notificationSchema)
    .handler(async ({ data: { type }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.notifications.query.getLastNotifications(currentUser.id, type);
    });


export const getNotificationsCount = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        return container.notifications.query.countUnreadNotifications(currentUser.id);
    });


export const markAllNotifAsRead = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(notificationSchema)
    .handler(async ({ data: { type }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.notifications.commands.markAllAsRead(currentUser.id, type);
    });


export const postDeleteSocialNotif = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(notificationIdSchema)
    .handler(async ({ data: { notificationId }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.notifications.commands.deleteSocialNotif(currentUser.id, notificationId);
    });
