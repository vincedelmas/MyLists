import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";
import {ActivityMediaDefinition} from "@/lib/server/domain/media/shared/activity/activity-media-definition";
import {tvActivityDefinition} from "@/lib/server/domain/media/tv/activity/tv-activity.definition";
import {movieActivityDefinition} from "@/lib/server/domain/media/movies/activity/movie-activity.definition";
import {gameActivityDefinition} from "@/lib/server/domain/media/games/activity/game-activity.definition";
import {bookActivityDefinition} from "@/lib/server/domain/media/books/activity/book-activity.definition";
import {mangaActivityDefinition} from "@/lib/server/domain/media/manga/activity/manga-activity.definition";


const activityMediaConfig: Record<MediaType, ActivityMediaDefinition> = {
    [MediaType.SERIES]: tvActivityDefinition,
    [MediaType.ANIME]: tvActivityDefinition,
    [MediaType.MOVIES]: movieActivityDefinition,
    [MediaType.GAMES]: gameActivityDefinition,
    [MediaType.BOOKS]: bookActivityDefinition,
    [MediaType.MANGA]: mangaActivityDefinition,
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


export const isValidActivityDate = (value: string) => {
    const date = toDateInputValue(value, { timeZone: "utc" });
    const today = toDateInputValue(new Date(), { timeZone: "utc" });
    return date >= MIN_ACTIVITY_DATE && date <= today;
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
