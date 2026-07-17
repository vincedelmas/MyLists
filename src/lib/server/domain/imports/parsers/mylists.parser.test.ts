import {describe, expect, it} from "vitest";
import {createMyListsCsvParser} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {
    animeMyListsCSVRowSchema,
    booksMyListsCSVRowSchema,
    gamesMyListsCSVRowSchema,
    mangaMyListsCSVRowSchema,
    moviesMyListsCSVRowSchema,
    seriesMyListsCSVRowSchema,
} from "@/lib/server/domain/imports/import-media.schemas";

import {COMMENT_MAX_LENGTH} from "@/lib/utils/constants";


const rowSchemas = {
    [MediaType.SERIES]: seriesMyListsCSVRowSchema,
    [MediaType.ANIME]: animeMyListsCSVRowSchema,
    [MediaType.MOVIES]: moviesMyListsCSVRowSchema,
    [MediaType.GAMES]: gamesMyListsCSVRowSchema,
    [MediaType.BOOKS]: booksMyListsCSVRowSchema,
    [MediaType.MANGA]: mangaMyListsCSVRowSchema,
};
const parseMyListsCsv = createMyListsCsvParser({ get: (kind) => rowSchemas[kind] });


const toCsv = (rows: Record<string, string>[]) => {
    const headers = Object.keys(rows[0]);
    const escapeCell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;

    return [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? "")).join(",")),
    ].join("\n");
};


describe("parseMyListsCsv", () => {
    it("parses MyLists manga rows into a manga import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Berserk",
            formatVersion: "1",
            mediaType: MediaType.MANGA,
            externalApiId: "2",
            externalApiSource: ApiProviderType.MANGA,
            releaseDate: "1989-08-25",
            status: Status.READING,
            currentChapter: "120",
            redo: "0",
            total: "120",
            rating: "10",
            favorite: "true",
            comment: "Dense.",
            addedAt: "2024-01-01 00:00:00",
            lastUpdated: "2024-01-02 00:00:00",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            failedCount: 0,
            items: [{
                name: "Berserk",
                mediaType: MediaType.MANGA,
                externalApiId: "2",
                externalApiSource: ApiProviderType.MANGA,
                payload: {
                    status: Status.READING,
                    currentChapter: 120,
                    redo: 0,
                    total: 120,
                    rating: 10,
                    favorite: true,
                    comment: "Dense.",
                },
            }],
        });
    });

    it("parses MyLists book rows into a books import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Dune",
            formatVersion: "1",
            mediaType: MediaType.BOOKS,
            externalApiId: "book-123",
            externalApiSource: ApiProviderType.BOOKS,
            releaseDate: "1965-08-01",
            status: Status.COMPLETED,
            actualPage: "412",
            redo: "1",
            total: "824",
            rating: "10",
            favorite: "true",
            comment: "Classic.",
            addedAt: "2024-01-01 00:00:00",
            lastUpdated: "2024-01-02 00:00:00",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            failedCount: 0,
            items: [{
                name: "Dune",
                mediaType: MediaType.BOOKS,
                externalApiId: "book-123",
                externalApiSource: ApiProviderType.BOOKS,
                payload: {
                    status: Status.COMPLETED,
                    actualPage: 412,
                    redo: 1,
                    total: 824,
                    rating: 10,
                    favorite: true,
                    comment: "Classic.",
                },
            }],
        });
    });

    it("parses MyLists series rows into a TV import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "The Bear",
            formatVersion: "1",
            mediaType: MediaType.SERIES,
            externalApiId: "136315",
            externalApiSource: ApiProviderType.TMDB,
            releaseDate: "2022-06-23",
            status: Status.WATCHING,
            rating: "8",
            favorite: "false",
            comment: "Sharp.",
            currentSeason: "2",
            currentEpisode: "4",
            redo: "1",
            redo2: "1,0,0",
            total: "12",
            addedAt: "2024-01-01 00:00:00",
            lastUpdated: "2024-01-02 00:00:00",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            totalCount: 1,
            failedCount: 0,
            items: [{
                rowNumber: 2,
                name: "The Bear",
                mediaType: MediaType.SERIES,
                releaseDate: "2022-06-23",
                externalApiId: "136315",
                externalApiSource: ApiProviderType.TMDB,
                status: ImportItemStatus.QUEUED,
                payload: {
                    status: Status.WATCHING,
                    rating: 8,
                    favorite: false,
                    comment: "Sharp.",
                    currentSeason: 2,
                    currentEpisode: 4,
                    redo: 1,
                    redo2: [1, 0, 0],
                    total: 12,
                },
            }],
        });
        expect(parsed.items[0].payload).not.toHaveProperty("addedAt");
        expect(parsed.items[0].payload).not.toHaveProperty("lastUpdated");
    });

    it("parses MyLists anime rows into a TV import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Frieren",
            formatVersion: "1",
            mediaType: MediaType.ANIME,
            externalApiId: "209867",
            externalApiSource: ApiProviderType.TMDB,
            releaseDate: "2023-09-29",
            status: Status.COMPLETED,
            rating: "10",
            favorite: "true",
            comment: "",
            currentSeason: "1",
            currentEpisode: "28",
            redo: "0",
            redo2: "[0]",
            total: "28",
            addedAt: "",
            lastUpdated: "",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            failedCount: 0,
            items: [{
                name: "Frieren",
                mediaType: MediaType.ANIME,
                payload: {
                    status: Status.COMPLETED,
                    rating: 10,
                    favorite: true,
                    comment: null,
                    currentSeason: 1,
                    currentEpisode: 28,
                    redo: 0,
                    redo2: [0],
                    total: 28,
                },
            }],
        });
        expect(parsed.items[0].payload).not.toHaveProperty("addedAt");
        expect(parsed.items[0].payload).not.toHaveProperty("lastUpdated");
    });

    it("parses MyLists game rows into a games import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Hades",
            formatVersion: "1",
            mediaType: MediaType.GAMES,
            externalApiId: "114795",
            externalApiSource: ApiProviderType.IGDB,
            releaseDate: "2020-09-17",
            status: Status.COMPLETED,
            rating: "9",
            favorite: "true",
            comment: "Great run.",
            playtime: "480",
            platform: "PC",
            addedAt: "2024-01-01 00:00:00",
            lastUpdated: "2024-01-02 00:00:00",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            totalCount: 1,
            failedCount: 0,
            items: [{
                rowNumber: 2,
                name: "Hades",
                mediaType: MediaType.GAMES,
                releaseDate: "2020-09-17",
                externalApiId: "114795",
                externalApiSource: ApiProviderType.IGDB,
                status: ImportItemStatus.QUEUED,
                payload: {
                    status: Status.COMPLETED,
                    rating: 9,
                    favorite: true,
                    comment: "Great run.",
                    playtime: 480,
                    platform: "PC",
                },
            }],
        });
        expect(parsed.items[0].payload).not.toHaveProperty("mediaName");
        expect(parsed.items[0].payload).not.toHaveProperty("externalApiId");
        expect(parsed.items[0].payload).not.toHaveProperty("id");
        expect(parsed.items[0].payload).not.toHaveProperty("addedAt");
        expect(parsed.items[0].payload).not.toHaveProperty("lastUpdated");
    });

    it("rejects statuses that are not compatible with the row media type", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Fight Club",
            formatVersion: "1",
            mediaType: MediaType.MOVIES,
            externalApiId: "550",
            externalApiSource: ApiProviderType.TMDB,
            releaseDate: "1999-10-15",
            status: Status.PLAYING,
            redo: "0",
            total: "1",
            rating: "9",
            favorite: "true",
            comment: "",
            addedAt: "",
            lastUpdated: "",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            failedCount: 1,
            items: [{
                status: ImportItemStatus.FAILED,
                mediaType: MediaType.MOVIES,
                statusReason: expect.stringContaining("Status is not valid for movies"),
            }],
        });
    });

    it("rejects comments that exceed the import limit", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Fight Club",
            formatVersion: "1",
            mediaType: MediaType.MOVIES,
            externalApiId: "550",
            externalApiSource: ApiProviderType.TMDB,
            releaseDate: "1999-10-15",
            status: Status.COMPLETED,
            redo: "0",
            total: "1",
            rating: "9",
            favorite: "true",
            comment: "x".repeat(COMMENT_MAX_LENGTH + 1),
            addedAt: "",
            lastUpdated: "",
            customCover: "",
        }]));

        expect(parsed).toMatchObject({
            failedCount: 1,
            items: [{
                status: ImportItemStatus.FAILED,
                mediaType: MediaType.MOVIES,
                statusReason: expect.stringContaining(`Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`),
            }],
        });
    });

    it("rejects files containing multiple media types", () => {
        expect(() => parseMyListsCsv(toCsv([
            {
                id: "1",
                userId: "42",
                mediaId: "100",
                mediaName: "Hades",
                formatVersion: "1",
                mediaType: MediaType.GAMES,
                externalApiId: "114795",
                externalApiSource: ApiProviderType.IGDB,
                releaseDate: "2020-09-17",
                status: Status.COMPLETED,
                rating: "9",
                favorite: "true",
                comment: "",
                playtime: "480",
                platform: "PC",
                addedAt: "",
                lastUpdated: "",
                customCover: "",
            },
            {
                id: "2",
                userId: "42",
                mediaId: "101",
                mediaName: "Fight Club",
                formatVersion: "1",
                mediaType: MediaType.MOVIES,
                externalApiId: "550",
                externalApiSource: ApiProviderType.TMDB,
                releaseDate: "1999-10-15",
                status: Status.COMPLETED,
                rating: "9",
                favorite: "true",
                comment: "",
                playtime: "",
                platform: "",
                addedAt: "",
                lastUpdated: "",
                customCover: "",
            },
        ]))).toThrow('The CSV file contains mixed media types. Row 3 is "movies" but expected "games".');
    });
});
