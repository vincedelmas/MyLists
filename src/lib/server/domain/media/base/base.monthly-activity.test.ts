import {describe, expect, it} from "vitest";
import {Status, UpdateType} from "@/lib/utils/enums";
import {BooksRepository, createBooksMonthlyActivity} from "@/lib/server/domain/media/books";
import {GamesRepository, createGamesMonthlyActivity} from "@/lib/server/domain/media/games";
import {createTvMonthlyActivity, TvRepository} from "@/lib/server/domain/media/tv";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";


describe("createMediaMonthlyActivity", () => {
    const books = createBooksMonthlyActivity(
        booksServerDefinition,
        new BooksRepository(booksServerDefinition),
    );

    it("classifies contribution flags from the current update and keeps them independent", () => {
        expect(books.createContribution({
            totalSpecific: 25,
            statusCounts: { [Status.COMPLETED]: 1 },
        }, UpdateType.STATUS)).toEqual({
            progressGained: 25,
            hadCompletion: true,
            redoGained: 0,
        });

        expect(books.createContribution({
            totalSpecific: 10,
            totalRedo: 2,
            statusCounts: { [Status.COMPLETED]: 1 },
        }, UpdateType.REDO)).toEqual({
            progressGained: 10,
            hadCompletion: false,
            redoGained: 2,
        });
    });

    it("ignores negative corrections instead of rewriting monthly history", () => {
        expect(books.createContribution({
            totalSpecific: -20,
            totalRedo: -1,
        }, UpdateType.PAGE)).toEqual({
            progressGained: 0,
            hadCompletion: false,
            redoGained: 0,
        });
    });

    it("uses each media's progress and timing policy", () => {
        const games = createGamesMonthlyActivity(
            gamesServerDefinition,
            new GamesRepository(gamesServerDefinition),
        );
        const anime = createTvMonthlyActivity(
            animeServerDefinition,
            new TvRepository(animeServerDefinition),
        );

        expect(games.createContribution({
            timeSpent: 90,
            totalSpecific: 999,
        }, UpdateType.PLAYTIME).progressGained).toBe(90);
        expect(games.progressToMinutes(90)).toBe(90);
        expect(books.progressToMinutes(10)).toBe(17);
        expect(anime.progressToMinutes(3, 24)).toBe(72);

        expect(anime.summarize([
            {mediaId: 1, progressGained: 2},
            {mediaId: 2, progressGained: 3},
        ], new Map([
            [1, {duration: 24}],
            [2, {duration: 45}],
        ]))).toEqual({
            count: 2,
            progressTotal: 5,
            timeGained: 183,
        });
    });
});
