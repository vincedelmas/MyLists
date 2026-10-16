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
    it("preserves the IMDb ID and personal rating, and handles BOM, CRLF and quoted titles", () => {
        const csv = convertToCsv([{ ...ratingRow, Const: " tt0137523 ", Title: 'A film, with "quotes" and é' }]);
        const parsed = parseImdbCsv(`\uFEFF${csv}\r\n`, "ratings");
        expect(parsed).toMatchObject({
            totalCount: 1, failedCount: 0,
            items: [{
                rowNumber: 2, name: 'A film, with "quotes" and é', releaseDate: "1999",
                externalApiId: null, externalApiSource: null, mediaType: MediaType.MOVIES,
                status: ImportItemStatus.QUEUED, payload: { imdbId: "tt0137523", status: Status.COMPLETED, rating: 7 },
            }],
        });
    });

    it("rejects missing/duplicate headers and the wrong file type", () => {
        const { "Your Rating": _rating, ...missingRating } = ratingRow;
        expect(() => parseImdbCsv(convertToCsv([missingRating]), "ratings")).toThrow("current IMDb");
        expect(() => parseImdbCsv(convertToCsv([ratingRow]).replace("Original Title", "Title"), "ratings")).toThrow("current IMDb");
        expect(() => parseImdbCsv(convertToCsv([ratingRow]), "watchlist")).toThrow("matching file type");
        expect(() => parseImdbCsv(convertToCsv([watchlistRow]), "ratings")).toThrow("matching file type");
    });

    it("accepts 1500 rows and rejects 1501, including unsupported title types", () => {
        expect(parseImdbCsv(convertToCsv(Array(1500).fill(ratingRow)), "ratings").totalCount).toBe(1500);
        expect(() => parseImdbCsv(convertToCsv(Array(1501).fill({ ...ratingRow, "Title Type": "TV Episode" })), "ratings"))
            .toThrow("Maximum is 1500");
    });
});
