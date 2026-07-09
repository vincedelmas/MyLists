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
