import type {MediaType, RatingSystemType} from "@/lib/utils/enums";


type YearRecapScope = MediaType | "all";
export type YearRecapReleaseMode = typeof yearRecapReleaseModes[number];


export const YEAR_RECAP_FIRST_YEAR = 2026;


export const yearRecapReleaseModes = ["automatic", "enabled", "disabled"] as const;


export type YearRecapReleaseStatus = {
    year: number;
    isAvailable: boolean;
    mode: YearRecapReleaseMode;
    automaticReleaseAt: string;
};


export type YearRecapMonth = {
    month: string;
    hours: number;
    repeats: number;
    completions: number;
    titleCount: number;
};


export type YearRecapMediaSummary = {
    mediaType: MediaType;
    hours: number;
    share: number;
    repeats: number;
    completions: number;
    titleCount: number;
    activeMonths: number;
    progress: number;
    progressUnit: string;
};


export type YearRecapTitle = {
    mediaId: number;
    mediaType: MediaType;
    name: string;
    imageCover: string;
    releaseDate: string | null;
    rating: number | null;
    favorite: boolean;
    hours: number;
    repeats: number;
    completions: number;
    activeMonths: number;
    progress: number;
    progressUnit: string;
};


export type YearRecapData = {
    year: number;
    scope: YearRecapScope;
    availableMediaTypes: MediaType[];
    totals: {
        hours: number;
        repeats: number;
        completions: number;
        titleCount: number;
        activeMonths: number;
        longestActiveStreak: number;
    };
    months: YearRecapMonth[];
    media: YearRecapMediaSummary[];
    topTitles: YearRecapTitle[];
    mostRepeatedTitle: YearRecapTitle | null;
    busiestMonth: YearRecapMonth | null;
    comparison: {
        referenceCount: number;
        referenceLabel: string;
        secondaryCount: number;
        secondaryLabel: string;
    } | null;
};


export type YearRecap = YearRecapData & {
    user: {
        name: string;
        ratingSystem: RatingSystemType;
    };
};
