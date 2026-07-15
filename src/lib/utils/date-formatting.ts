import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/; // YYYY-MM-DD


interface DateInputValueOptions {
    timeZone?: "local" | "utc";
}


interface ShiftDateInputValueOptions {
    min?: string;
    max?: string;
    days?: number;
    months?: number;
}


const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
});


/** parse a date string, Date object, or number (seconds, not milliseconds) into a Date object */
export const dateFromUTCInput = (input: string | number | Date) => {
    if (input instanceof Date) {
        return new Date(input.getTime());
    }

    if (typeof input === "number") {
        return new Date(input * 1000);
    }

    const str = input.trim();
    if (!str) return new Date(NaN);

    if (/^\d{4}$/.test(str)) {
        return new Date(`${str}-01-01T00:00:00.000Z`);
    }

    if (/^\d{4}-\d{2}$/.test(str)) {
        return new Date(`${str}-01T00:00:00.000Z`);
    }

    if (CALENDAR_DATE.test(str)) {
        return new Date(`${str}T00:00:00.000Z`);
    }

    let normalized = str.replace(" ", "T");
    if (normalized.includes("T") && !/([Zz]|[+-]\d{2}:?\d{2})$/.test(normalized)) {
        normalized += "Z";
    }

    return new Date(normalized);
};


/** returns a plain date string in the format: "2024-05-20" or null */
export const formatDateForDb = (value: number | string | null | undefined) => {
    if (!value) return null;

    const date = dateFromUTCInput(value);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().slice(0, 10);
};


/** Entry format is 'YYYY-MM-DD', returns an object with year, month, and day strings */
export const extractDate = (input?: string | null) => {
    const [year = DEFAULT_DASH_FALLBACK, month = DEFAULT_DASH_FALLBACK, day = DEFAULT_DASH_FALLBACK] = input?.split("-", 3) ?? [];
    return { year, month, day };
};


/** Entry format is 'YYYY-MM-DD', returns a year string or DEFAULT_FALLBACK */
export const extractYear = (date?: string | null) => {
    return extractDate(date).year;
};


/** returns a plain date string in the format: "Jan 1, 2024" or DEFAULT_FALLBACK */
export const formatDate = (value: string | number | null | undefined) => {
    if (!value) return DEFAULT_DASH_FALLBACK;

    const date = dateFromUTCInput(value);
    if (isNaN(date.getTime())) return DEFAULT_DASH_FALLBACK;

    return shortDateFormatter.format(date);
};


/** @returns relative time string from now to the given timestamp */
export const formatRelativeTime = (input: string | number | null | undefined, opts: Intl.RelativeTimeFormatOptions = {}) => {
    if (!input) return "never";

    const utcDate = dateFromUTCInput(input);
    if (isNaN(utcDate.getTime())) return "never";

    const diffSeconds = Math.round((utcDate.getTime() - Date.now()) / 1000);

    const THRESHOLDS: { max: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
        { max: 60, divisor: 1, unit: "second" },
        { max: 3600, divisor: 60, unit: "minute" },
        { max: 86400, divisor: 3600, unit: "hour" },
        { max: 604800, divisor: 86400, unit: "day" },
        { max: 2592000, divisor: 604800, unit: "week" },
        { max: 31536000, divisor: 2592000, unit: "month" },
        { max: Infinity, divisor: 31536000, unit: "year" },
    ];

    const absDiff = Math.abs(diffSeconds);
    const rtf = getRelativeTimeFormatter(opts);
    const rule = THRESHOLDS.find((threshold) => absDiff < threshold.max)!;

    return rtf.format(Math.round(diffSeconds / rule.divisor), rule.unit);
};


/** @returns whole-day relative time from today to the given calendar date */
export const formatCalendarRelativeDate = (input: string | null | undefined, opts: Intl.RelativeTimeFormatOptions = {}) => {
    const target = input ? readCalendarDate(input) : null;
    if (!target) return { diffDays: null, relativeTime: "never" };

    const now = new Date();
    const todayEpochDay = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY);
    const diffDays = target.epochDay - todayEpochDay;
    const absDiff = Math.abs(diffDays);
    const rtf = getRelativeTimeFormatter(opts);

    if (absDiff < 7) return { diffDays, relativeTime: rtf.format(diffDays, "day") };
    if (absDiff < 30) return { diffDays, relativeTime: rtf.format(Math.round(diffDays / 7), "week") };
    if (absDiff < 365) return { diffDays, relativeTime: rtf.format(Math.round(diffDays / 30), "month") };

    return { diffDays, relativeTime: rtf.format(Math.round(diffDays / 365), "year") };
};


/** @returns month name from the given month number or string */
export const formatMonth = (month: string | number, opts: Intl.DateTimeFormatOptions = {}) => {
    const value = Number(month);
    if (!Number.isInteger(value) || value < 1 || value > 12) return String(month);

    return new Intl.DateTimeFormat("en-US", { month: "long", ...opts, timeZone: "UTC" })
        .format(new Date(Date.UTC(2000, value - 1, 1, 12)));
};


/** @returns month year from the given date string 'YYYY-MM' */
export const formatMonthYear = (value: string, opts: Intl.DateTimeFormatOptions = {}) => {
    const [year, month] = value.split("-");
    if (!readCalendarDate(`${year}-${month}-01`)) return value;

    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC", year: "numeric", ...opts });
};


/** @returns 'YYYY-MM-DD' calendar string from date object or string */
export const toDateInputValue = (value?: string | number | Date, opts: DateInputValueOptions = {}) => {
    if (!value) return "";

    const date = value instanceof Date ? value : dateFromUTCInput(value);
    if (isNaN(date.getTime())) return "";

    const useUTC = opts.timeZone === "utc" || (opts.timeZone !== "local" && !(value instanceof Date));
    const year = useUTC ? date.getUTCFullYear() : date.getFullYear();
    const month = useUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    const day = useUTC ? date.getUTCDate() : date.getDate();

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};


/** @returns a local Date from a 'YYYY-MM-DD' calendar string */
export const dateInputValueToDate = (value: string) => {
    const parsed = readCalendarDate(value);
    return parsed ? new Date(parsed.year, parsed.month - 1, parsed.day) : new Date(Number.NaN);
};


/** @returns an ISO date string */
export const toDateTimeAttribute = (value: string | number | null | undefined) => {
    if (!value) return undefined;

    const date = dateFromUTCInput(value);
    if (isNaN(date.getTime())) return undefined;

    return date.toISOString();
};


/** @returns a date string human formatted or DEFAULT_DASH_FALLBACK */
export const formatDateTime = (value: string | number | null | undefined, opts: { seconds?: boolean } = {}) => {
    if (!value) return DEFAULT_DASH_FALLBACK;

    const date = dateFromUTCInput(value);
    if (isNaN(date.getTime())) return DEFAULT_DASH_FALLBACK;

    const { seconds = false } = opts;
    let formatter = dateTimeFormatters.get(`${seconds}`);

    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-US", {
            hour12: false,
            year: "numeric",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: seconds ? "numeric" : undefined,
        });
        dateTimeFormatters.set(`${seconds}`, formatter);
    }

    return formatter.format(date);
};


/** @returns sort order for two date inputs, invalid dates sorted last */
export const compareDateInputs = (a: string | number | null | undefined, b: string | number | null | undefined) => {
    const aTime = a ? dateFromUTCInput(a).getTime() : Number.NaN;
    const bTime = b ? dateFromUTCInput(b).getTime() : Number.NaN;

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;

    return aTime - bTime;
};


/** @returns sort order for two 'YYYY-MM-DD' calendar dates, invalid dates sorted last */
export const compareCalendarDates = (a: string | null | undefined, b: string | null | undefined) => {
    const aDate = a ? readCalendarDate(a) : null;
    const bDate = b ? readCalendarDate(b) : null;

    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;

    return aDate.epochDay - bDate.epochDay;
};


/** @returns a shifted 'YYYY-MM-DD' calendar string, optionally clamped to min/max */
export const shiftDateInputValue = (value: string, opts: ShiftDateInputValueOptions = {}) => {
    const parsed = readCalendarDate(value);
    if (!parsed) return "";

    const date = new Date(parsed.utcMs);
    if (opts.months) date.setUTCMonth(date.getUTCMonth() + opts.months);
    if (opts.days) date.setUTCDate(date.getUTCDate() + opts.days);

    let shifted = date.toISOString().slice(0, 10);
    if (opts.min && compareCalendarDates(shifted, opts.min) < 0) shifted = opts.min;
    if (opts.max && compareCalendarDates(shifted, opts.max) > 0) shifted = opts.max;

    return shifted;
};


/** @returns UTC ISO bounds for an inclusive calendar-date range */
export const calendarDateRangeToISOString = (startDate: string, endDate = startDate) => {
    const end = readCalendarDate(endDate);
    const start = readCalendarDate(startDate);
    if (!start || !end || start.epochDay > end.epochDay) return null;

    return {
        startDate: new Date(start.utcMs).toISOString(),
        endDate: new Date(end.utcMs + MS_PER_DAY - 1).toISOString(),
    };
};


/** @returns 'YYYY-MM' month bucket from a UTC date input */
export const monthBucketFromDateInput = (value?: string | number | Date) => {
    const date = value ? dateFromUTCInput(value) : new Date();
    if (isNaN(date.getTime())) return "";

    const year = String(date.getUTCFullYear()).padStart(4, "0");
    return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};


function readCalendarDate(input: string) {
    const match = CALENDAR_DATE.exec(input);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utcMs = Date.UTC(year, month - 1, day);
    const date = new Date(utcMs);

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }

    return { day, epochDay: Math.floor(utcMs / MS_PER_DAY), month, utcMs, year };
}


function getRelativeTimeFormatter(opts: Intl.RelativeTimeFormatOptions = {}) {
    const style = opts.style ?? "short";
    const numeric = opts.numeric ?? "auto";
    const localeMatcher = opts.localeMatcher ?? "best fit";
    const cacheKey = `${localeMatcher}|${numeric}|${style}`;
    let formatter = relativeTimeFormatters.get(cacheKey);

    if (!formatter) {
        formatter = new Intl.RelativeTimeFormat("en-US", { localeMatcher, numeric, style });
        relativeTimeFormatters.set(cacheKey, formatter);
    }

    return formatter;
}
