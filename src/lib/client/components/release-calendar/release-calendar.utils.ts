import {ReleaseCalendarSearch} from "@/lib/schemas/release-calendar.schema";
import {dateFromUTCInput, shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";


export const getReleaseCalendarPeriod = (date: string, view: NonNullable<ReleaseCalendarSearch["view"]>) => {
    const anchor = dateFromUTCInput(view === "month" ? `${date.slice(0, 7)}-01` : date);
    const startDate = shiftDateInputValue(toDateInputValue(anchor, { timeZone: "utc" }), { days: -((anchor.getUTCDay() + 6) % 7) });

    let dayCount = 7;
    if (view === "month") {
        const lastDay = new Date(anchor);
        lastDay.setUTCMonth(anchor.getUTCMonth() + 1, 0);
        dayCount = Math.ceil((((anchor.getUTCDay() + 6) % 7) + lastDay.getUTCDate()) / 7) * 7;
    }

    return {
        startDate,
        endDate: shiftDateInputValue(startDate, { days: dayCount - 1 }),
        days: Array.from({ length: dayCount }, (_, index) => shiftDateInputValue(startDate, { days: index })),
    };
};
