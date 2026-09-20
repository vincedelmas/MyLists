export const normalizeIsbn = (value: string): string | null => {
    const isbn = value.replace(/[\s-]/g, "").toUpperCase();
    if (/^\d{9}[\dX]$/.test(isbn)) {
        const checksum = [...isbn].reduce((sum, digit, i) => sum + (digit === "X" ? 10 : Number(digit)) * (10 - i), 0);
        if (checksum % 11 !== 0) return null;
        const prefix = `978${isbn.slice(0, 9)}`;
        const sum = [...prefix].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
        return `${prefix}${(10 - sum % 10) % 10}`;
    }
    if (!/^97[89]\d{10}$/.test(isbn)) return null;
    const sum = [...isbn].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0 ? isbn : null;
};

export const normalizeBookName = (name: string) => name.normalize("NFKD")
    .replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

type BookIdentity = {name: string; authors: string[]; isbns: string[]; openLibraryWorkId?: string | null};

export const conflictingBookVariants = (first: string, second: string) => {
    const derivative = /\b(omnibus|abridged|adaptation|study guide|summary|summaries|box set|boxed set|collected works|complete works|integrale|abrege)\b/;
    const names = [first, second].map(normalizeBookName);
    if (names.some(name => derivative.test(name))) return true;
    const partNumber = /\b(?:vol(?:ume)?|book|tome|part|livre)\s+(\d+|[ivxlcdm]+)\b/;
    const romanParts: Record<string, string> = {i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10"};
    const [a, b] = names.map(name => {const part = name.match(partNumber)?.[1]; return part ? romanParts[part] ?? part : undefined;});
    return !!a && !!b && a !== b;
};

// This key broadens the review scan to initials; it is not sufficient for automatic attachment.
export const bookAuthorReviewKey = (name: string) => {
    const words = normalizeBookName(name).split(" ").filter(Boolean);
    return words.length > 1 ? `${words[0][0]} ${words.at(-1)}` : words[0] ?? "";
};

export const bookMatchEvidence = (
    first: BookIdentity,
    second: BookIdentity,
) => {
    const firstAuthors = new Set(first.authors.map(normalizeBookName));
    if (!second.authors.some(author => firstAuthors.has(normalizeBookName(author)))) return null;
    if (conflictingBookVariants(first.name, second.name)) return null;
    const sameTitle = normalizeBookName(first.name) === normalizeBookName(second.name);
    if (sameTitle && first.isbns.some(isbn => second.isbns.includes(isbn))) return "ISBN";
    if (first.openLibraryWorkId && first.openLibraryWorkId === second.openLibraryWorkId) return "Open Library work";
    return sameTitle ? "Title and author" : null;
};

export const reviewBookMatch = (first: BookIdentity & {pages?: number | null; publishers?: string | null}, second: BookIdentity & {pages?: number | null; publishers?: string | null}) => {
    if (conflictingBookVariants(first.name, second.name)) return null;
    const exact = bookMatchEvidence(first, second);
    if (exact) return {score: exact === "ISBN" ? 100 : exact === "Open Library work" ? 98 : 90, evidence: [exact]};
    const authorKeys = new Set(first.authors.map(bookAuthorReviewKey));
    if (!second.authors.some(author => authorKeys.has(bookAuthorReviewKey(author)))) return null;
    const firstName = normalizeBookName(first.name), secondName = normalizeBookName(second.name);
    let score: number;
    const evidence = ["Compatible author names"];
    if (firstName === secondName) {
        score = 85; evidence.push("Same normalized title");
    }
    else {
        const stopWords = new Set(["a", "an", "the", "and", "of", "in", "le", "la", "les", "de", "du", "des", "et", "un", "une"]);
        const a = new Set(firstName.split(" ").filter(word => !stopWords.has(word)));
        const b = new Set(secondName.split(" ").filter(word => !stopWords.has(word)));
        const similarity = 2 * [...a].filter(word => b.has(word)).length / (a.size + b.size);
        if (Math.min(a.size, b.size) < 2 || similarity < 0.8) return null;
        score = Math.round(60 + similarity * 20); evidence.push("Similar title wording");
    }
    if (first.pages && second.pages && Math.min(first.pages, second.pages) / Math.max(first.pages, second.pages) >= 0.9) {score += 2; evidence.push("Similar page counts");}
    if (first.publishers && second.publishers && normalizeBookName(first.publishers) === normalizeBookName(second.publishers)) {score += 1; evidence.push("Same publisher");}
    return {score: Math.min(score, 89), evidence};
};
