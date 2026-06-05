const DEFAULT_FALLBACK = "-";


export const isLatin1 = (input: string) => {
    return [...input].every((char) => char.charCodeAt(0) <= 255);
};


export const capitalize = (input: string | null | undefined) => {
    const trimmed = input?.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};


export const formatLocaleName = (code: string | undefined | null, type: "language" | "region") => {
    if (!code?.trim()) return DEFAULT_FALLBACK;

    if (type === "language" && code.toLowerCase() === "cn") return "Chinese";

    try {
        return new Intl.DisplayNames(["en"], { type }).of(code) || code;
    }
    catch {
        return code;
    }
};


export const formatHtmlText = (input: string) => {
    return input?.replace(/<[^>]*>?/gm, "") ?? "";
};
