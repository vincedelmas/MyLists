import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


const localeDisplayNames: Partial<Record<"language" | "region", Intl.DisplayNames>> = {};


export const emptyStringToNull = (value: unknown) => {
    return typeof value === "string" && value.trim() === "" ? null : value;
}


export const isLatin1 = (input: string) => {
    return [...input].every((char) => char.charCodeAt(0) <= 255);
};


export const capitalize = (input: string | null | undefined) => {
    const trimmed = input?.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};


export const formatLocaleName = (code: string | undefined | null, type: "language" | "region") => {
    if (!code?.trim()) return DEFAULT_DASH_FALLBACK;
    if (type === "language" && code.toLowerCase() === "cn") return "Chinese";

    try {
        const displayNames = localeDisplayNames[type] ??= new Intl.DisplayNames(["en"], { type });
        return displayNames.of(code) || code;
    }
    catch {
        return code;
    }
};


export const formatHtmlText = (input: string) => {
    return input?.replace(/<[^>]*>?/gm, "") ?? "";
};
