import {describe, expect, it, vi} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import {NotificationCommands} from "./notification.commands";
import {NotificationsQuery} from "./notifications.query";
import type {NotificationsRepository} from "./notifications.repository";
import {TvUpcomingNotificationCommand} from "@/lib/server/domain/media/tv/features/notifications/tv-upcoming-notification.command";


const createRepository = () => ({
    countUnreadNotifications: vi.fn(),
    createMediaNotification: vi.fn(),
    markAllAsRead: vi.fn(),
    searchMediaNotification: vi.fn(),
});


describe("notification capabilities", () => {
    it("deduplicates an unchanged upcoming episode", async () => {
        const repository = createRepository();
        repository.searchMediaNotification.mockResolvedValue({
            episode: 4,
            releaseDate: "2026-07-24",
            season: 2,
        });
        const commands = new TvUpcomingNotificationCommand(
            MediaType.SERIES,
            {} as never,
            repository as unknown as typeof NotificationsRepository,
        );

        await commands.create([{
            date: "2026-07-24",
            episodeToAir: 4,
            imageCover: "cover.jpg",
            lastEpisode: 10,
            mediaId: 42,
            mediaName: "A Series",
            seasonToAir: 2,
            status: Status.WATCHING,
            userId: 7,
        }]);

        expect(repository.createMediaNotification).not.toHaveBeenCalled();
    });

    it("records a changed episode and derives the season-finale flag", async () => {
        const repository = createRepository();
        repository.searchMediaNotification.mockResolvedValue({
            episode: 3,
            releaseDate: "2026-07-24",
            season: 2,
        });
        const commands = new TvUpcomingNotificationCommand(
            MediaType.ANIME,
            {} as never,
            repository as unknown as typeof NotificationsRepository,
        );

        await commands.create([{
            date: "2026-07-24",
            episodeToAir: 4,
            imageCover: "cover.jpg",
            lastEpisode: 4,
            mediaId: 42,
            mediaName: "An Anime",
            seasonToAir: 2,
            status: Status.WATCHING,
            userId: 7,
        }]);

        expect(repository.createMediaNotification).toHaveBeenCalledWith({
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

    it("keeps read-state commands and unread counts scoped to the recipient", async () => {
        const repository = createRepository();
        repository.countUnreadNotifications.mockResolvedValue({ media: 2, social: 1, total: 3 });
        const commands = new NotificationCommands(repository as unknown as typeof NotificationsRepository);
        const query = new NotificationsQuery(repository as unknown as typeof NotificationsRepository);

        await commands.markAllAsRead(7, "social");
        await expect(query.countUnreadNotifications(7)).resolves.toEqual({ media: 2, social: 1, total: 3 });

        expect(repository.markAllAsRead).toHaveBeenCalledWith(7, "social");
        expect(repository.countUnreadNotifications).toHaveBeenCalledWith(7);
    });
});
