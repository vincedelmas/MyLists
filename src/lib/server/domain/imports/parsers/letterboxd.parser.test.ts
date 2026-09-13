import {describe, expect, it} from "vitest";
import {ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {parseLetterboxdCsv} from "@/lib/server/domain/imports/parsers/letterboxd.parser";


const headers = "Date,Name,Year,Letterboxd URI";
const movie = "2024-01-01,Fight Club,1999,https://boxd.it/2a9q";


describe("parseLetterboxdCsv", () => {
    it("reads reordered headers, BOM, CRLF, quoted titles and half-star ratings", () => {
        const parsed = parseLetterboxdCsv('\uFEFFRating,Name,Year,Date,Letterboxd URI\r\n3.5,"Paris, Texas",1984,2024-01-01,https://boxd.it/29Ts\r\n\r\n', "ratings");

        expect(parsed).toEqual({
            totalCount: 1,
            failedCount: 0,
            items: [{
                rowNumber: 2,
                name: "Paris, Texas",
                releaseDate: "1984",
                mediaType: MediaType.MOVIES,
                externalApiId: null,
                externalApiSource: null,
                status: ImportItemStatus.QUEUED,
                statusReason: null,
                payload: { status: Status.COMPLETED, rating: 7 },
            }],
        });
    });

    it.each([
        ["0.5", 1], ["5", 10], ["", null], ["  ", null],
    ])("converts rating %j to %j", (rating, expected) => {
        const parsed = parseLetterboxdCsv(`${headers},Rating\n${movie},${rating}`, "ratings");
        expect(parsed.failedCount).toBe(0);
        expect(parsed.items[0].payload.rating).toBe(expected);
    });

    it.each([
        ["watched", Status.COMPLETED],
        ["watchlist", Status.PLAN_TO_WATCH],
    ] as const)("maps %s to %s", (fileType, status) => {
        const parsed = parseLetterboxdCsv(`${headers}\n${movie}`, fileType);
        expect(parsed.failedCount).toBe(0);
        expect(parsed.items[0].payload).toEqual({ status, rating: null });
    });

    it.each(["0", "-1", "5.5", "3.25", "bad", "NaN", "Infinity"])("reports invalid rating %j per row while keeping valid rows", rating => {
        const parsed = parseLetterboxdCsv(`${headers},Rating\n${movie},${rating}\n${movie},4`, "ratings");
        expect(parsed).toMatchObject({
            totalCount: 2,
            failedCount: 1,
            items: [
                { rowNumber: 2, name: "Fight Club", status: ImportItemStatus.FAILED, payload: { Rating: rating } },
                { rowNumber: 3, status: ImportItemStatus.QUEUED, payload: { rating: 8 } },
            ],
        });
        expect(parsed.items[0].statusReason).toContain("Rating:");
    });

    it.each([
        [" ", "1999", "Name"],
        ["Fight Club", "", "Year"],
        ["Fight Club", "1999-01-01", "Year"],
        ["Fight Club", "unknown", "Year"],
    ])("reports invalid title/year values (%j, %j)", (name, year, field) => {
        const parsed = parseLetterboxdCsv(`${headers}\n2024-01-01,${name},${year},https://boxd.it/2a9q`, "watched");
        expect(parsed.failedCount).toBe(1);
        expect(parsed.items[0].statusReason).toContain(`${field}:`);
    });

    it.each([
        "Date,Name,Year,Name",
        "Date,Name,Year",
        `${headers},Rating,Rewatch,Tags,Watched Date`,
        `${headers},Rating,Review,Tags,Watched Date`,
    ])("rejects missing/duplicate columns and unsupported export headers: %s", header => {
        expect(() => parseLetterboxdCsv(header, "watched")).toThrow("Upload the original");
    });

    it("rejects a ratings file selected as watched or a watched file selected as ratings", () => {
        expect(() => parseLetterboxdCsv(`${headers},Rating\n${movie},4`, "watched")).toThrow("matching file type");
        expect(() => parseLetterboxdCsv(`${headers}\n${movie}`, "ratings")).toThrow("matching file type");
    });

    it("requires an explicit file type", () => {
        expect(() => parseLetterboxdCsv(`${headers}\n${movie}`)).toThrow("Select the Letterboxd CSV file type");
    });

    it.each([`${headers}\n${movie},extra`, `${headers}\n2024-01-01,"unfinished`])("rejects malformed CSV", csv => {
        expect(() => parseLetterboxdCsv(csv, "watched")).toThrow("CSV structure is invalid");
    });

    it("rejects empty files and files without movies", () => {
        expect(() => parseLetterboxdCsv("", "watched")).toThrow("CSV file is empty");
        expect(() => parseLetterboxdCsv(headers, "watched")).toThrow("contains no rows");
    });

    it("accepts 1500 rows and rejects 1501", () => {
        const csv = `${headers}\n${Array(1500).fill(movie).join("\n")}`;
        expect(parseLetterboxdCsv(csv, "watched").totalCount).toBe(1500);
        expect(() => parseLetterboxdCsv(`${csv}\n${movie}`, "watched")).toThrow("Maximum is 1500");
    });
});
