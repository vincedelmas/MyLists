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

    it("rejects a ratings file selected as watched or a watched file selected as ratings", () => {
        expect(() => parseLetterboxdCsv(`${headers},Rating\n${movie},4`, "watched")).toThrow("matching file type");
        expect(() => parseLetterboxdCsv(`${headers}\n${movie}`, "ratings")).toThrow("matching file type");
    });

    it("accepts 1500 rows and rejects 1501", () => {
        const csv = `${headers}\n${Array(1500).fill(movie).join("\n")}`;
        expect(parseLetterboxdCsv(csv, "watched").totalCount).toBe(1500);
        expect(() => parseLetterboxdCsv(`${csv}\n${movie}`, "watched")).toThrow("Maximum is 1500");
    });
});
