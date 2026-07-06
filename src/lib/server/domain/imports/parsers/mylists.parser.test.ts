import {describe, expect, it} from "vitest";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MYLISTS_CSV_REQUIRED_HEADERS, MyListsCsvFileError, parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";


const requiredHeaders = [...MYLISTS_CSV_REQUIRED_HEADERS];


const toCsv = (headers: readonly string[], rows: Record<string, string>[]) => {
    const escapeCell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? "")).join(",")),
    ].join("\n");
};


describe("parseMyListsCsv", () => {
    it("parses mixed media rows and media-specific payload fields", () => {
        const headers = [...requiredHeaders, "rating", "favorite", "redo", "current_season", "redo2"];
        const csv = toCsv(headers, [
            {
                format_version: "1",
                media_type: "movies",
                external_api_source: "tmdb",
                external_api_id: "550",
                name: "Fight Club",
                release_date: "1999-10-15",
                status: "Completed",
                rating: "9",
                favorite: "true",
                redo: "2",
            },
            {
                format_version: "1",
                media_type: "series",
                external_api_source: "tmdb",
                external_api_id: "1399",
                name: "Game of Thrones",
                release_date: "2011-04",
                status: "Watching",
                rating: "8.5",
                favorite: "false",
                current_season: "3",
                redo2: "[1,2]",
            },
        ]);

        const result = parseMyListsCsv(csv);

        expect(result).toMatchObject({ totalCount: 2, failedCount: 0 });
        expect(result.items[0]).toMatchObject({
            rowNumber: 2,
            name: "Fight Club",
            externalApiId: "550",
            releaseDate: "1999-10-15",
            mediaType: MediaType.MOVIES,
            status: ImportItemStatus.QUEUED,
            externalApiSource: ApiProviderType.TMDB,
            payload: {
                redo: 2,
                rating: 9,
                redo2: null,
                favorite: true,
                currentSeason: null,
                status: Status.COMPLETED,
            },
        });
        expect(result.items[1]).toMatchObject({
            rowNumber: 3,
            mediaType: MediaType.SERIES,
            payload: {
                redo2: [1, 2],
                currentSeason: 3,
                status: Status.WATCHING,
            },
        });
    });

    it("accepts year and year-month release dates", () => {
        const csv = toCsv(requiredHeaders, [
            {
                format_version: "1", media_type: "movies", external_api_source: "tmdb",
                external_api_id: "1", name: "Movie", release_date: "2024", status: "Completed",
            },
            {
                format_version: "1", media_type: "movies", external_api_source: "tmdb",
                external_api_id: "2", name: "Movie 2", release_date: "2024-02", status: "Completed",
            },
        ]);

        expect(parseMyListsCsv(csv).failedCount).toBe(0);
    });

    it("accepts required headers in any order", () => {
        const headers = [...requiredHeaders].reverse();
        const csv = toCsv(headers, [{
            format_version: "1",
            media_type: "movies",
            external_api_source: "tmdb",
            external_api_id: "1",
            name: "Movie",
            release_date: "2024",
            status: "Completed",
        }]);

        expect(parseMyListsCsv(csv)).toMatchObject({
            failedCount: 0,
            items: [{ name: "Movie", mediaType: MediaType.MOVIES }],
        });
    });

    it("stores invalid rows as failed items with their raw payload", () => {
        const csv = toCsv(requiredHeaders, [
            {
                format_version: "1", media_type: "movies", name: "Missing identifier",
                release_date: "2023-02-29", status: "Completed",
            },
            {
                format_version: "1", media_type: "invalid", external_api_source: "tmdb",
                external_api_id: "2", name: "Invalid type", release_date: "2024-01-01", status: "Completed",
            },
        ]);

        const result = parseMyListsCsv(csv);

        expect(result.failedCount).toBe(2);
        expect(result.items[0]).toMatchObject({
            releaseDate: "2023-02-29",
            mediaType: MediaType.MOVIES,
            status: ImportItemStatus.FAILED,
        });
        expect(result.items[0].statusReason).toContain("release_date");
        expect(result.items[1]).toMatchObject({
            mediaType: null,
            status: ImportItemStatus.FAILED,
        });
        expect(result.items[1].payload).toMatchObject({ media_type: "invalid" });
    });

    it("allows matching by name when no external identifier is available", () => {
        const csv = toCsv(requiredHeaders, [{
            format_version: "1",
            media_type: "movies",
            name: "The Movie",
            release_date: "2024",
            status: "Completed",
        }]);

        expect(parseMyListsCsv(csv).items[0]).toMatchObject({
            name: "The Movie",
            externalApiId: null,
            externalApiSource: null,
            status: ImportItemStatus.QUEUED,
        });
    });

    it("rejects the users API provider for media imports", () => {
        const csv = toCsv(requiredHeaders, [{
            format_version: "1",
            media_type: "movies",
            external_api_source: "users",
            external_api_id: "42",
            name: "The Movie",
            release_date: "2024",
            status: "Completed",
        }]);

        const item = parseMyListsCsv(csv).items[0];

        expect(item.status).toBe(ImportItemStatus.FAILED);
        expect(item.statusReason).toContain("external_api_source");
    });

    it("rejects missing or unsupported headers as a file-level error", () => {
        expect(() => parseMyListsCsv("format_version,name\n1,Movie"))
            .toThrow(MyListsCsvFileError);
        expect(() => parseMyListsCsv(toCsv([...requiredHeaders, "unknown"], [{
            format_version: "1",
            media_type: "movies",
            external_api_source: "tmdb",
            external_api_id: "1",
            name: "Movie",
            release_date: "2024",
            status: "Completed",
            unknown: "x",
        }])))
            .toThrow(MyListsCsvFileError);
    });

    it("rejects malformed CSV as a file-level error", () => {
        expect(() => parseMyListsCsv(`${requiredHeaders.join(",")}\n"unterminated`))
            .toThrow(MyListsCsvFileError);
    });
});
