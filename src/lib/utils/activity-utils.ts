import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";


export const isValidActivityDate = (value: string) => {
    const date = toDateInputValue(value, { timeZone: "utc" });
    const today = toDateInputValue(new Date(), { timeZone: "utc" });

    return date >= MIN_ACTIVITY_DATE && date <= today;
};


export const toActivityDisplayValue = (mediaType: MediaType, value: number) => {
    const timing = getMediaDefinition(mediaType).progress.timing;
    if (timing.kind !== "stored-minutes") return value;

    return Math.round((value / timing.minutesPerInputUnit) * 100) / 100;
};


export const toActivityStoredValue = (mediaType: MediaType, value: number) => {
    const timing = getMediaDefinition(mediaType).progress.timing;
    return Number(value) * (timing.kind === "stored-minutes" ? timing.minutesPerInputUnit : 1);
};


export const getDefaultActivityDate = (year: number, month: number) => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    if (isCurrentMonth) return toDateInputValue(today);

    return shiftDateInputValue(`${year}-${zeroPad(month)}-01`, { days: -1, months: 1 });
};


export const getMonthlyActivityStatSummary = (mediaType: MediaType, progressTotal: number, count: number) => {
    const definition = getMediaDefinition(mediaType);

    if (mediaType === MediaType.GAMES) {
        const entry = definition.terminology.entry;
        return count > 0 ? `${count} ${count === 1 ? entry.singular : entry.plural}` : null;
    }

    if (mediaType === MediaType.MOVIES) {
        const entry = definition.terminology.entry;
        return progressTotal > 0 ? `${progressTotal} ${progressTotal === 1 ? entry.singular : entry.plural}` : null;
    }

    if (progressTotal <= 0) return null;

    return `${toActivityDisplayValue(mediaType, progressTotal)} ${definition.progress.unit.short}`;
};
