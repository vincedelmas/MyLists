import {describe, expect, it} from "vitest";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";


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

    it("accepts 1500 rows and rejects 1501", () => {
        const rows = Array.from({ length: 1500 }, () => movieRow());
        expect(parseMyListsCsv(toCsv(rows)).totalCount).toBe(1500);
        expect(() => parseMyListsCsv(toCsv([...rows, movieRow()]))).toThrow("Maximum is 1500");
    });
});


const movieRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
    mediaName: "Fight Club", mediaType: MediaType.MOVIES, formatVersion: "2",
    externalApiId: "550", externalApiSource: ApiProviderType.TMDB, releaseDate: "1999-10-15",
    status: Status.COMPLETED, redo: "0", total: "1", rating: "9", favorite: "false", comment: "",
    ...overrides,
});
