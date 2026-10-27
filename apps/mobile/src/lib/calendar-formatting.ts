import {getCalendarDayDifference} from "@/lib/utils/formatting/date";

// Keep the app's English labels independent of Intl.RelativeTimeFormat, which some native runtimes lack.
export function formatCalendarRelativeLabel(input: string | null | undefined, now = new Date()) {
    const days = getCalendarDayDifference(input, now);
    if (days === null) return "Upcoming";
    if (days === 0) return "today";
    if (days === -1) return "yesterday";
    if (days === 1) return "tomorrow";
    const absoluteDays = Math.abs(days);
    const [divisor, unit]: [number, string] = absoluteDays < 7 ? [1, "day"] : absoluteDays < 30 ? [7, "week"] : absoluteDays < 365 ? [30, "month"] : [365, "year"];
    const value = Math.round(days / divisor);
    if (Math.abs(value) === 1) return `${value > 0 ? "next" : "last"} ${unit}`;
    const duration = `${Math.abs(value)} ${unit}s`;
    return value > 0 ? `in ${duration}` : `${duration} ago`;
}
