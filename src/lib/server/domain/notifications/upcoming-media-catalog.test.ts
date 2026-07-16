import {describe, expect, it, vi} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import {UpcomingMediaCatalogRepository} from "@/lib/server/domain/notifications/upcoming-media-catalog";


describe("normalized upcoming media catalog", () => {
    it("routes owner and notification reads only to the concrete family reader", async () => {
        const series = reader("series");
        const anime = reader("anime");
        const movies = reader("movies");
        const games = reader("games");
        const catalog = new UpcomingMediaCatalogRepository(
            { [MediaType.SERIES]: series, [MediaType.ANIME]: anime } as any,
            movies as any,
            games as any,
        );

        await expect(catalog.getForOwner(MediaType.GAMES, 42)).resolves.toEqual([item("games")]);
        expect(games.getUpcomingMedia).toHaveBeenCalledWith({
            ownerId: 42, actorId: 42, reason: "owner", mediaTypeEnabled: true,
        });
        await expect(catalog.getForNotifications(MediaType.SERIES)).resolves.toEqual([item("series")]);
        expect(series.getUpcomingMediaForNotifications).toHaveBeenCalledOnce();
        expect(anime.getUpcomingMedia).not.toHaveBeenCalled();
        expect(movies.getUpcomingMedia).not.toHaveBeenCalled();
    });
});


const item = (name: string) => ({
    userId: 1,
    mediaId: 1,
    mediaName: name,
    imageCover: `${name}.jpg`,
    date: "2026-07-20",
    status: Status.COMPLETED,
});


const reader = (name: string) => ({
    getUpcomingMedia: vi.fn(async () => [item(name)]),
    getUpcomingMediaForNotifications: vi.fn(async () => [item(name)]),
});
