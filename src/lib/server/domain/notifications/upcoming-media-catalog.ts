import {MediaType} from "@/lib/utils/enums";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvListReadRepository} from "@/lib/server/domain/library/tv/tv-list-read.repository";
import {GameListReadRepository} from "@/lib/server/domain/library/games/game-list-read.repository";
import {MovieListReadRepository} from "@/lib/server/domain/library/movies/movie-list-read.repository";


export type UpcomingMediaType = TvMediaType | typeof MediaType.MOVIES | typeof MediaType.GAMES;
export type NotificationMediaType = Exclude<UpcomingMediaType, typeof MediaType.GAMES>;


interface UpcomingMediaCatalog {
    getForOwner(kind: UpcomingMediaType, ownerId: number): Promise<UpComingMedia[]>;
    getForNotifications(kind: NotificationMediaType): Promise<UpComingMedia[]>;
}


export class UpcomingMediaCatalogRepository implements UpcomingMediaCatalog {
    constructor(
        private readonly tvReaders: Record<TvMediaType, TvListReadRepository>,
        private readonly movieReader: MovieListReadRepository,
        private readonly gameReader: GameListReadRepository,
    ) {}

    async getForOwner(kind: UpcomingMediaType, ownerId: number): Promise<UpComingMedia[]> {
        const access = { ownerId, actorId: ownerId, reason: "owner" as const, mediaTypeEnabled: true as const };
        if (kind === MediaType.SERIES || kind === MediaType.ANIME) {
            return this.tvReaders[kind].getUpcomingMedia(access);
        }
        if (kind === MediaType.MOVIES) return this.movieReader.getUpcomingMedia(access);
        return this.gameReader.getUpcomingMedia(access);
    }

    async getForNotifications(kind: NotificationMediaType): Promise<UpComingMedia[]> {
        if (kind === MediaType.SERIES || kind === MediaType.ANIME) {
            return this.tvReaders[kind].getUpcomingMediaForNotifications();
        }
        return this.movieReader.getUpcomingMediaForNotifications();
    }
}
