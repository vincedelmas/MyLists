import {describe, expect, it} from "vitest";
import {convertToCsv} from "@/lib/utils/csv";
import {ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {parseImdbCsv} from "@/lib/server/domain/imports/parsers/imdb.parser";


const ratingRow = {
    Const: "tt0137523",
    "Your Rating": "7",
    "Date Rated": "2024-01-01",
    Title: "Fight Club",
    "Original Title": "Fight Club",
    URL: "https://www.imdb.com/title/tt0137523/",
    "Title Type": "Movie",
    "IMDb Rating": "8.8",
    "Runtime (mins)": "139",
    Year: "1999",
    Genres: "Drama, Thriller",
    "Num Votes": "2000000",
    "Release Date": "1999-10-15",
    Directors: "David Fincher",
};
const watchlistRow = { Position: "1", Created: "2024-01-01", Modified: "2024-01-01", Description: "", ...ratingRow };


describe("parseImdbCsv", () => {
    it("imports the personal rating, ignores metadata and IMDb IDs, and handles BOM, CRLF and quoted titles", () => {
        const csv = convertToCsv([{ ...ratingRow, Title: 'A film, with "quotes" and é' }]);
        const parsed = parseImdbCsv(`\uFEFF${csv}\r\n`, "ratings");
        expect(parsed).toMatchObject({
            totalCount: 1, failedCount: 0,
            items: [{
                rowNumber: 2, name: 'A film, with "quotes" and é', releaseDate: "1999",
                externalApiId: null, externalApiSource: null, mediaType: MediaType.MOVIES,
                status: ImportItemStatus.QUEUED, payload: { status: Status.COMPLETED, rating: 7 },
            }],
        });
    });

    it("imports watchlist entries without a rating even when Your Rating is present", () => {
        const parsed = parseImdbCsv(convertToCsv([watchlistRow]), "watchlist");
        expect(parsed.items[0].payload).toEqual({ status: Status.PLAN_TO_WATCH, rating: null });
    });

    it.each(["Movie", "TV Movie", "Short", "TV Short", "TV Special", "Video", "movie", "tvMovie"])("accepts standalone title type %s", type => {
        const parsed = parseImdbCsv(convertToCsv([{ ...ratingRow, "Title Type": type }]), "ratings");
        expect(parsed.items[0].status).toBe(ImportItemStatus.QUEUED);
    });

    it.each(["TV Series", "TV Mini Series", "TV Episode", "Video Game", "Music Video", "Podcast Series", "Unknown"])("skips unsupported title type %s without requiring movie fields", type => {
        const parsed = parseImdbCsv(convertToCsv([{ ...ratingRow, "Title Type": type, Year: "", "Your Rating": "" }]), "ratings");
        expect(parsed.failedCount).toBe(0);
        expect(parsed.items[0]).toMatchObject({ status: ImportItemStatus.SKIPPED, mediaType: null });
        expect(parsed.items[0].statusReason).toContain(type);
    });

    it.each(["0", "11", "7.5", "bad", "NaN"])("reports invalid personal rating %j while preserving valid and skipped rows", rating => {
        const parsed = parseImdbCsv(convertToCsv([
            { ...ratingRow, "Your Rating": rating }, ratingRow, { ...ratingRow, "Title Type": "TV Series" },
        ]), "ratings");
        expect(parsed).toMatchObject({
            totalCount: 3, failedCount: 1,
            items: [
                { rowNumber: 2, status: ImportItemStatus.FAILED },
                { rowNumber: 3, status: ImportItemStatus.QUEUED },
                { rowNumber: 4, status: ImportItemStatus.SKIPPED },
            ],
        });
        expect(parsed.items[0].statusReason).toContain("Your Rating:");
    });

    it.each(["", " "])("keeps an empty personal rating empty instead of using IMDb Rating", rating => {
        const parsed = parseImdbCsv(convertToCsv([{ ...ratingRow, "Your Rating": rating }]), "ratings");
        expect(parsed.failedCount).toBe(0);
        expect(parsed.items[0].payload.rating).toBeNull();
    });

    it.each([
        { Title: "" }, { Year: "" }, { Year: "1999-01-01" }, { "Title Type": "" },
    ])("reports invalid movie fields %j", fields => {
        const parsed = parseImdbCsv(convertToCsv([{ ...ratingRow, ...fields }]), "ratings");
        expect(parsed.failedCount).toBe(1);
        expect(parsed.items[0].status).toBe(ImportItemStatus.FAILED);
    });

    it("accepts reordered columns and additional metadata", () => {
        const reordered = Object.fromEntries(Object.entries({ ...ratingRow, Extra: "ignored" }).reverse());
        expect(parseImdbCsv(convertToCsv([reordered]), "ratings").items[0].payload.rating).toBe(7);
    });

    it("rejects missing/duplicate headers and the wrong file type", () => {
        const { "Your Rating": _rating, ...missingRating } = ratingRow;
        expect(() => parseImdbCsv(convertToCsv([missingRating]), "ratings")).toThrow("current IMDb");
        expect(() => parseImdbCsv(convertToCsv([ratingRow]).replace("Original Title", "Title"), "ratings")).toThrow("current IMDb");
        expect(() => parseImdbCsv(convertToCsv([ratingRow]), "watchlist")).toThrow("matching file type");
        expect(() => parseImdbCsv(convertToCsv([watchlistRow]), "ratings")).toThrow("matching file type");
    });

    it("requires a supported file type and valid nonempty CSV", () => {
        const csv = convertToCsv([ratingRow]);
        expect(() => parseImdbCsv(csv)).toThrow("Select IMDb");
        expect(() => parseImdbCsv(csv, "watched")).toThrow("Select IMDb");
        expect(() => parseImdbCsv("", "ratings")).toThrow("empty");
        expect(() => parseImdbCsv(Object.keys(ratingRow).join(","), "ratings")).toThrow("no rows");
        expect(() => parseImdbCsv(`${csv},extra`, "ratings")).toThrow("CSV structure is invalid");
        expect(() => parseImdbCsv(`${csv}\n"unfinished`, "ratings")).toThrow("CSV structure is invalid");
    });

    it("accepts 1500 rows and rejects 1501, including unsupported title types", () => {
        expect(parseImdbCsv(convertToCsv(Array(1500).fill(ratingRow)), "ratings").totalCount).toBe(1500);
        expect(() => parseImdbCsv(convertToCsv(Array(1501).fill({ ...ratingRow, "Title Type": "TV Episode" })), "ratings"))
            .toThrow("Maximum is 1500");
    });
});
