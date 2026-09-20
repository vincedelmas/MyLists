import {describe, expect, it} from "vitest";
import {bookMatchEvidence, normalizeIsbn} from "./book-matching";

describe("conservative book identity evidence", () => {
    it("normalizes equivalent ISBNs and rejects invalid checksums and identifiers", () => {
        expect(normalizeIsbn("0-14-032872-6")).toBe("9780140328721");
        expect(normalizeIsbn("978-0-14-032872-1")).toBe("9780140328721");
        expect(normalizeIsbn("0-306-40615-2")).toBe("9780306406157");
        for (const value of ["9780140328722", "0306406153", "not-an-isbn", "1234567890128"]) expect(normalizeIsbn(value)).toBeNull();
    });

    const original = {name: "A Book", authors: ["An Author"], isbns: ["9780306406157"], openLibraryWorkId: "/works/OL1W"};
    it("distinguishes suggestions from identifier evidence and requires compatible authors", () => {
        expect(bookMatchEvidence(original, {...original, isbns: [], openLibraryWorkId: null})).toBe("Title and author");
        expect(bookMatchEvidence(original, {...original, openLibraryWorkId: null})).toBe("ISBN");
        expect(bookMatchEvidence(original, {...original, name: "Un livre", isbns: []})).toBe("Open Library work");
        expect(bookMatchEvidence(original, {...original, authors: ["A Different Author"]})).toBeNull();
    });
    it("rejects derivative works and conflicting numbered parts even with shared work IDs", () => {
        for (const name of ["A Book: Study Guide", "A Book (abridged)", "A Book Omnibus", "A Book: intégrale"]) {
            expect(bookMatchEvidence(original, {...original, name})).toBeNull();
        }
        expect(bookMatchEvidence({...original, name: "The Story, Volume 1"}, {...original, name: "The Story, Volume 2"})).toBeNull();
    });
});
