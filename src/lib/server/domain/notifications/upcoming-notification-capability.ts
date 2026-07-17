import type {MediaModule} from "@/lib/server/core/container/media/media-module.registry";


export type UpcomingNotificationMediaModule = Extract<MediaModule, {
    notifications: { upcoming: unknown };
}>;


export const supportsUpcomingNotifications = (
    mediaModule: MediaModule,
): mediaModule is UpcomingNotificationMediaModule => "notifications" in mediaModule;
