import {afterEach, describe, expect, it, vi} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {NotificationService} from "./notification.service";
import {NotificationsRepository} from "./notifications.repository";


describe("NotificationService", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("deduplicates an unchanged upcoming episode", async () => {
        vi.spyOn(NotificationsRepository, "searchMediaNotification").mockResolvedValue({
            episode: 4,
            releaseDate: "2026-07-24",
            season: 2,
        } as never);
        const createMediaNotification = vi.spyOn(NotificationsRepository, "createMediaNotification")
            .mockResolvedValue();

        await NotificationService.createUpcomingMediaNotifications(MediaType.SERIES, [{
            date: "2026-07-24",
            episodeToAir: 4,
            lastEpisode: 10,
            mediaId: 42,
            mediaName: "A Series",
            seasonToAir: 2,
            userId: 7,
        }]);

        expect(createMediaNotification).not.toHaveBeenCalled();
    });

    it("records a changed episode and derives the season-finale flag", async () => {
        vi.spyOn(NotificationsRepository, "searchMediaNotification").mockResolvedValue({
            episode: 3,
            releaseDate: "2026-07-24",
            season: 2,
        } as never);
        const createMediaNotification = vi.spyOn(NotificationsRepository, "createMediaNotification")
            .mockResolvedValue();

        await NotificationService.createUpcomingMediaNotifications(MediaType.ANIME, [{
            date: "2026-07-24",
            episodeToAir: 4,
            lastEpisode: 4,
            mediaId: 42,
            mediaName: "An Anime",
            seasonToAir: 2,
            userId: 7,
        }]);

        expect(createMediaNotification).toHaveBeenCalledWith({
            episode: 4,
            isSeasonFinale: true,
            mediaId: 42,
            mediaType: MediaType.ANIME,
            name: "An Anime",
            releaseDate: "2026-07-24",
            season: 2,
            userId: 7,
        });
    });

    it("keeps read-state changes and unread counts scoped to the recipient", async () => {
        const markAllAsRead = vi.spyOn(NotificationsRepository, "markAllAsRead").mockResolvedValue();
        const countUnreadNotifications = vi.spyOn(NotificationsRepository, "countUnreadNotifications")
            .mockResolvedValue({ media: 2, social: 1, total: 3 });

        await NotificationService.markAllAsRead(7, "social");
        await expect(NotificationService.countUnreadNotifications(7))
            .resolves.toEqual({ media: 2, social: 1, total: 3 });

        expect(markAllAsRead).toHaveBeenCalledWith(7, "social");
        expect(countUnreadNotifications).toHaveBeenCalledWith(7);
    });
});
