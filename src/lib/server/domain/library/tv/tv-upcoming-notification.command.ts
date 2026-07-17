import {compareCalendarDates} from "@/lib/utils/date-formatting";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {TvListReadRepository} from "@/lib/server/domain/library/tv/tv-list-read.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


type MediaNotificationRepository = Pick<
    typeof NotificationsRepository,
    "searchMediaNotification" | "createMediaNotification"
>;


export class TvUpcomingNotificationCommand {
    constructor(
        private readonly kind: TvMediaType,
        private readonly list: TvListReadRepository,
        private readonly repository: MediaNotificationRepository,
    ) {}

    candidates() {
        return this.list.getUpcomingMediaForNotifications();
    }

    async create(items: UpComingMedia[]) {
        for (const item of items) {
            const notification = await this.repository.searchMediaNotification(item.userId, this.kind, item.mediaId);
            if (
                notification
                && compareCalendarDates(notification.releaseDate, item.date) === 0
                && notification.episode === item.episodeToAir
                && notification.season === item.seasonToAir
            ) {
                continue;
            }

            await this.repository.createMediaNotification({
                userId: item.userId,
                name: item.mediaName,
                mediaType: this.kind,
                mediaId: item.mediaId,
                releaseDate: item.date,
                season: item.seasonToAir,
                episode: item.episodeToAir,
                isSeasonFinale: item.lastEpisode === item.episodeToAir && item.episodeToAir !== 1,
            });
        }
    }
}
