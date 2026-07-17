import {NotifTab} from "@/lib/types/notifications.types";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


/** Read-only notification capability. */
export class NotificationsQuery {
    constructor(private readonly repository: typeof NotificationsRepository) {}

    getLastNotifications(userId: number, type: NotifTab, limit = 8) {
        return this.repository.getLastNotifications(userId, type, limit);
    }

    countUnreadNotifications(userId: number) {
        return this.repository.countUnreadNotifications(userId);
    }
}
