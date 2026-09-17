import {describe, expect, it} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import {groupContinueItems} from "./group-continue-items";
import type {ContinueItemFor} from "./continue.types";


describe("Continue groups", () => {
    const series = {
        mediaType: MediaType.SERIES,
        status: Status.WATCHING,
        currentSeason: 3,
        currentEpisode: 10,
        epsPerSeason: [{ season: 1, episodes: 5 }, { season: 3, episodes: 10 }],
    } as ContinueItemFor<typeof MediaType.SERIES>;
    const book = {
        mediaType: MediaType.BOOKS,
        status: Status.READING,
        actualPage: 100,
        pages: 100,
    } as ContinueItemFor<typeof MediaType.BOOKS>;
    const manga = {
        mediaType: MediaType.MANGA,
        status: Status.READING,
        currentChapter: 7,
        chapters: 7,
    } as ContinueItemFor<typeof MediaType.MANGA>;

    it("separates finished progress while preserving card order and saved statuses", () => {
        const reading = { ...book, actualPage: 95 };
        const watching = { ...series, currentEpisode: 7 };
        const items = [series, reading, manga, watching, book];

        expect(groupContinueItems(items)).toEqual({
            active: [reading, watching],
            finished: [series, manga, book],
        });
        expect(items).toEqual([series, reading, manga, watching, book]);
        expect(items.map(item => item.status)).toEqual([
            Status.WATCHING, Status.READING, Status.READING, Status.WATCHING, Status.READING,
        ]);
    });

    it("keeps ongoing titles and games in the main queue even without a known next increment", () => {
        const items = [
            { ...series, epsPerSeason: [...series.epsPerSeason, { season: 4, episodes: 0 }] },
            { ...manga, chapters: null },
            { mediaType: MediaType.GAMES, playtime: 90 } as ContinueItemFor<typeof MediaType.GAMES>,
        ];

        expect(groupContinueItems(items)).toEqual({ active: items, finished: [] });
    });

    it("returns a watched title to the main queue when another season is added", () => {
        expect(groupContinueItems([series]).finished).toEqual([series]);

        const renewedSeries = { ...series, epsPerSeason: [...series.epsPerSeason, { season: 4, episodes: 10 }] };
        expect(groupContinueItems([renewedSeries])).toEqual({ active: [renewedSeries], finished: [] });
    });
});
