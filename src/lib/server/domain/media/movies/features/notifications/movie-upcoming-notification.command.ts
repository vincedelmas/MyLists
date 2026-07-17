import {compareCalendarDates} from "@/lib/utils/date-formatting";
import {MediaType} from "@/lib/utils/enums";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {MovieListReadRepository} from "@/lib/server/domain/media/movies/library/movie-list-read.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


type MediaNotificationRepository = Pick<
    typeof NotificationsRepository,
    "searchMediaNotification" | "createMediaNotification"
>;


export class MovieUpcomingNotificationCommand {
    constructor(
        private readonly list: MovieListReadRepository,
        private readonly repository: MediaNotificationRepository,
    ) {
    }

    candidates() {
        return this.list.getUpcomingMediaForNotifications();
    }

    async create(items: UpComingMedia[]) {
        for (const item of items) {
            const notification = await this.repository.searchMediaNotification(item.userId, MediaType.MOVIES, item.mediaId);
            if (notification && compareCalendarDates(notification.releaseDate, item.date) === 0) continue;

            await this.repository.createMediaNotification({
                userId: item.userId,
                name: item.mediaName,
                mediaType: MediaType.MOVIES,
                mediaId: item.mediaId,
                releaseDate: item.date,
            });
        }
    }
}
