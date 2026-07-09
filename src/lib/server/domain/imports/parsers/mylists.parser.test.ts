import {describe, expect, it} from "vitest";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";


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
                    addedAt: "2024-01-01 00:00:00",
                    lastUpdated: "2024-01-02 00:00:00",
                },
            }],
        });
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
                    addedAt: null,
                    lastUpdated: null,
                },
            }],
        });
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
                    addedAt: "2024-01-01 00:00:00",
                    lastUpdated: "2024-01-02 00:00:00",
                },
            }],
        });
        expect(parsed.items[0].payload).not.toHaveProperty("mediaName");
        expect(parsed.items[0].payload).not.toHaveProperty("externalApiId");
        expect(parsed.items[0].payload).not.toHaveProperty("id");
    });
});
