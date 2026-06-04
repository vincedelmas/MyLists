import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";


type ActivityMediaConfig = {
    longUnit?: string;
    inputStep: number;
    shortUnit?: string;
    toStoredValue: (value: number) => number;
    toDisplayValue: (value: number) => number;
    calculateTime: (specificGained: number, duration?: number) => number;
}


const activityMediaConfig: Record<MediaType, ActivityMediaConfig> = {
    [MediaType.SERIES]: {
        inputStep: 1,
        shortUnit: "eps",
        longUnit: "Episodes",
        toStoredValue: identity,
        toDisplayValue: identity,
        calculateTime: (specificGained, duration = 20) => specificGained * duration,
    },
    [MediaType.ANIME]: {
        inputStep: 1,
        shortUnit: "eps",
        longUnit: "Episodes",
        toStoredValue: identity,
        toDisplayValue: identity,
        calculateTime: (specificGained, duration = 20) => specificGained * duration,
    },
    [MediaType.MOVIES]: {
        inputStep: 1,
        toStoredValue: identity,
        toDisplayValue: identity,
        calculateTime: (specificGained, duration = 100) => specificGained * duration,
    },
    [MediaType.GAMES]: {
        shortUnit: "h.",
        inputStep: 0.25,
        longUnit: "Hours Played",
        calculateTime: identity,
        toStoredValue: (hours) => hours * 60,
        toDisplayValue: (minutes) => Math.round((minutes / 60) * 100) / 100,
    },
    [MediaType.BOOKS]: {
        inputStep: 1,
        shortUnit: "p.",
        longUnit: "Pages Read",
        toStoredValue: identity,
        toDisplayValue: identity,
        calculateTime: (specificGained) => specificGained * 1.7,
    },
    [MediaType.MANGA]: {
        inputStep: 1,
        shortUnit: "ch.",
        longUnit: "Chapters Read",
        toStoredValue: identity,
        toDisplayValue: identity,
        calculateTime: (specificGained) => specificGained * 7,
    },
};


export const getActivityUnitLabel = (mediaType: MediaType, length: "short" | "long" = "long") => {
    return length === "short"
        ? activityMediaConfig[mediaType].shortUnit
        : activityMediaConfig[mediaType].longUnit;
};


export const getActivityInputStep = (mediaType: MediaType) => {
    return activityMediaConfig[mediaType].inputStep;
};


export const toActivityDisplayValue = (mediaType: MediaType, value: number) => {
    return activityMediaConfig[mediaType].toDisplayValue(value);
};


export const toActivityStoredValue = (mediaType: MediaType, value: number) => {
    return activityMediaConfig[mediaType].toStoredValue(Number(value));
};


export const calculateActivityTime = (mediaType: MediaType, specificGained: number, duration?: number) => {
    return activityMediaConfig[mediaType].calculateTime(specificGained, duration);
};


export const getMonthlyActivityStatSummary = (mediaType: MediaType, specificTotal: number, count: number) => {
    if (mediaType === MediaType.GAMES) {
        return count > 0 ? `${count} ${count === 1 ? "game" : "games"}` : null;
    }

    if (mediaType === MediaType.MOVIES) {
        return specificTotal > 0 ? `${specificTotal} ${specificTotal === 1 ? "movie" : "movies"}` : null;
    }

    const unitLabel = getActivityUnitLabel(mediaType, "short");
    if (!unitLabel || specificTotal <= 0) return null;

    return `${toActivityDisplayValue(mediaType, specificTotal)} ${unitLabel}`;
};


export const getDefaultActivityDate = (year: number, month: number) => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    if (isCurrentMonth) return toDateInputValue(today);

    return shiftDateInputValue(`${year}-${zeroPad(month)}-01`, { days: -1, months: 1 });
};


function identity(value: number) {
    return value;
}
