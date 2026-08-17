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
    titleCount: number;
    completions: number;
};


export type YearRecapMediaSummary = {
    mediaType: MediaType;
    hours: number;
    share: number;
    repeats: number;
    progress: number;
    titleCount: number;
    completions: number;
    activeMonths: number;
    progressUnit: string;
};


export type YearRecapTitle = {
    name: string;
    hours: number;
    repeats: number;
    mediaId: number;
    progress: number;
    favorite: boolean;
    imageCover: string;
    completions: number;
    activeMonths: number;
    progressUnit: string;
    mediaType: MediaType;
    rating: number | null;
    releaseDate: string | null;
};


export type YearRecapData = {
    year: number;
    scope: YearRecapScope;
    months: YearRecapMonth[];
    topTitles: YearRecapTitle[];
    media: YearRecapMediaSummary[];
    availableMediaTypes: MediaType[];
    busiestMonth: YearRecapMonth | null;
    mostRepeatedTitle: YearRecapTitle | null;
    totals: {
        hours: number;
        repeats: number;
        completions: number;
        titleCount: number;
        activeMonths: number;
        longestActiveStreak: number;
    };
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
