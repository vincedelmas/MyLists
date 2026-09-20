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

export const bookMatchEvidence = (
    first: { name: string; authors: string[]; isbns: string[]; openLibraryWorkId?: string | null },
    second: { name: string; authors: string[]; isbns: string[]; openLibraryWorkId?: string | null },
) => {
    const firstAuthors = new Set(first.authors.map(normalizeBookName));
    if (!second.authors.some(author => firstAuthors.has(normalizeBookName(author)))) return null;
    // These publications can describe the same story without representing the same work.
    const derivative = /\b(omnibus|abridged|adaptation|study guide|summary|summaries|box set|boxed set|collected works|complete works|integrale|abrege)\b/;
    if (derivative.test(normalizeBookName(first.name)) || derivative.test(normalizeBookName(second.name))) return null;
    const partNumber = /\b(?:vol(?:ume)?|book|tome|part|livre)\s+(\d+|[ivxlcdm]+)\b/;
    const firstPart = normalizeBookName(first.name).match(partNumber)?.[1];
    const secondPart = normalizeBookName(second.name).match(partNumber)?.[1];
    if (firstPart && secondPart && firstPart !== secondPart) return null;
    const sameTitle = normalizeBookName(first.name) === normalizeBookName(second.name);
    if (sameTitle && first.isbns.some(isbn => second.isbns.includes(isbn))) return "ISBN";
    if (first.openLibraryWorkId && first.openLibraryWorkId === second.openLibraryWorkId) return "Open Library work";
    return sameTitle ? "Title and author" : null;
};
