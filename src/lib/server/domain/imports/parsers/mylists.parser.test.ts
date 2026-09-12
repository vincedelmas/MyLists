import {describe, expect, it} from "vitest";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";

import {COMMENT_MAX_LENGTH} from "@/lib/utils/constants";
import {MYLISTS_FORMAT_ERROR} from "@/lib/server/domain/imports/mylists-format";


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
            formatVersion: "2",
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
            formatVersion: "2",
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
            formatVersion: "2",
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
            seasons: JSON.stringify([{ season: 1, redo: 1, rating: 7 }, { season: 2, redo: 0, rating: 9 }]),
            firstWatchProgress: "12",
            total: "20",
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
                    favorite: false,
                    comment: "Sharp.",
                    seasons: [{ season: 1, redo: 1, rating: 7 }, { season: 2, redo: 0, rating: 9 }],
                    firstWatchProgress: 12,
                },
            }],
        });
        expect(parsed.items[0].payload).not.toHaveProperty("rating");
        expect(parsed.items[0].payload).not.toHaveProperty("redo");
        expect(parsed.items[0].payload).not.toHaveProperty("total");
        expect(parsed.items[0].payload).not.toHaveProperty("currentSeason");
        expect(parsed.items[0].payload).not.toHaveProperty("currentEpisode");
        expect(parsed.items[0].payload).not.toHaveProperty("addedAt");
        expect(parsed.items[0].payload).not.toHaveProperty("lastUpdated");
    });

    it("parses MyLists anime rows into a TV import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Frieren",
            formatVersion: "2",
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
            seasons: JSON.stringify([{ season: 1, redo: 0, rating: 10 }]),
            firstWatchProgress: "28",
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
                    favorite: true,
                    comment: null,
                    seasons: [{ season: 1, redo: 0, rating: 10 }],
                    firstWatchProgress: 28,
                },
            }],
        });
        expect(parsed.items[0].payload).not.toHaveProperty("addedAt");
        expect(parsed.items[0].payload).not.toHaveProperty("lastUpdated");
    });

    it.each([MediaType.SERIES, MediaType.ANIME])("rejects %s exports without explicit season data", mediaType => {
        expect(() => parseMyListsCsv(toCsv(["1", "2"].map(formatVersion => ({
            mediaName: "Show",
            formatVersion,
            mediaType,
            externalApiId: "100",
            externalApiSource: ApiProviderType.TMDB,
            releaseDate: "2024-01-01",
            status: Status.COMPLETED,
            rating: "8",
            redo: "[1,0]",
            firstWatchProgress: "16",
        }))))).toThrow(MYLISTS_FORMAT_ERROR);
    });

    it.each([MediaType.SERIES, MediaType.ANIME])("requires first-watch progress when importing %s", mediaType => {
        expect(() => parseMyListsCsv(toCsv([{
            mediaName: "Show",
            formatVersion: "2",
            mediaType,
            externalApiId: "100",
            externalApiSource: ApiProviderType.TMDB,
            releaseDate: "2024-01-01",
            status: Status.COMPLETED,
            total: "40",
            seasons: JSON.stringify([{ season: 1, redo: 2, rating: 8 }]),
        }]))).toThrow(MYLISTS_FORMAT_ERROR);
    });

    it("parses MyLists game rows into a games import payload", () => {
        const parsed = parseMyListsCsv(toCsv([{
            id: "1",
            userId: "42",
            mediaId: "100",
            mediaName: "Hades",
            formatVersion: "2",
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
            formatVersion: "2",
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
            formatVersion: "2",
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
                formatVersion: "2",
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
                formatVersion: "2",
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
        ]))).toThrow(MYLISTS_FORMAT_ERROR);
    });

    it.each(["", "0", "1", "3", "99"])("rejects unsupported movie format version %j for the whole file", formatVersion => {
        expect(() => parseMyListsCsv(toCsv([movieRow(), movieRow({ formatVersion })])))
            .toThrow(MYLISTS_FORMAT_ERROR);
    });

    it.each(["formatVersion", "mediaType", "externalApiId", "rating", "status"])("rejects a missing %s column", column => {
        const row = movieRow();
        delete row[column];
        expect(() => parseMyListsCsv(toCsv([row]))).toThrow(MYLISTS_FORMAT_ERROR);
    });

    it("rejects duplicate headers rather than silently replacing cells", () => {
        const csv = toCsv([movieRow()]).replace("rating,favorite", "rating,rating");
        expect(() => parseMyListsCsv(csv)).toThrow(MYLISTS_FORMAT_ERROR);
    });

    it("handles reordered columns, a BOM, Unicode, quotes, commas and multiline comments", () => {
        const row = movieRow({ mediaName: 'Amélie, "Paris"', comment: 'Line one\n"Quoted", line two' });
        const reordered = Object.fromEntries(Object.entries(row).reverse());
        const parsed = parseMyListsCsv(`\uFEFF${toCsv([reordered])}`);
        expect(parsed.failedCount).toBe(0);
        expect(parsed.items[0]).toMatchObject({ name: row.mediaName, payload: { comment: row.comment } });
    });

    it.each([
        ["rating", "11"], ["rating", "not a number"], ["redo", "-1"], ["redo", ""], ["total", ""],
        ["favorite", "maybe"], ["status", "Not a status"], ["mediaName", ""], ["externalApiId", ""],
        ["externalApiId", "not-an-id"], ["externalApiId", "-1"], ["externalApiId", "550.5"],
        ["externalApiId", "1e3"], ["externalApiId", "9007199254740993"],
    ])("reports an invalid %s value as a row error while retaining valid rows", (field, value) => {
        const parsed = parseMyListsCsv(toCsv([movieRow(), movieRow({ [field]: value })]));
        expect(parsed).toMatchObject({ totalCount: 2, failedCount: 1 });
        expect(parsed.items[0].status).toBe(ImportItemStatus.QUEUED);
        expect(parsed.items[1]).toMatchObject({ rowNumber: 3, status: ImportItemStatus.FAILED, statusReason: expect.stringContaining(field) });
    });

    it.each(["", "mediaType,formatVersion\n", 'mediaType,formatVersion\n"unterminated', "a,b\n1,2,3"])("rejects empty or malformed CSV %j", csv => {
        expect(() => parseMyListsCsv(csv)).toThrow();
    });

    it("accepts 3000 rows and rejects 3001", () => {
        const rows = Array.from({ length: 3000 }, () => movieRow());
        expect(parseMyListsCsv(toCsv(rows)).totalCount).toBe(3000);
        expect(() => parseMyListsCsv(toCsv([...rows, movieRow()]))).toThrow("Maximum is 3000");
    });
});


const movieRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
    mediaName: "Fight Club", mediaType: MediaType.MOVIES, formatVersion: "2",
    externalApiId: "550", externalApiSource: ApiProviderType.TMDB, releaseDate: "1999-10-15",
    status: Status.COMPLETED, redo: "0", total: "1", rating: "9", favorite: "false", comment: "",
    ...overrides,
});
