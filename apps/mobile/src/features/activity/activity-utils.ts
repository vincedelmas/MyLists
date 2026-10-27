import type {MobileMonthlyActivity, MonthlyActivityInput} from "../../lib/api-client";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {toActivityDisplayValue} from "@/lib/utils/media/activity";
import {formatNumber} from "@/lib/utils/formatting/number";

export type ActivityRow = MobileMonthlyActivity["items"][number];
export type ActivityPeriod = Pick<MonthlyActivityInput, "year" | "month" | "view">;

export const activityKinds = [
    { value: "all", label: "All summaries" }, { value: "completed", label: "Completed" },
    { value: "progressed", label: "Progressed" }, { value: "redo", label: "Re-experienced" },
] as const;
export const activitySorts = [
    { value: "latest", label: "Latest activity" }, { value: "oldest", label: "Oldest activity" },
    { value: "title_asc", label: "Title (A → Z)" }, { value: "title_desc", label: "Title (Z → A)" },
    { value: "time_desc", label: "Most time" }, { value: "time_asc", label: "Least time" },
] as const;

export const getActivitySignals = (row: Pick<ActivityRow, "hidden" | "hadCompletion" | "redoGained" | "progressGained" | "occurrences">, view: ActivityPeriod["view"]) => {
    const latest = view === "year" ? row.occurrences?.[0] ?? row : row;
    if (latest.hidden) return ["Hidden"];
    if (latest.hadCompletion) return ["Completed"];
    if (latest.redoGained > 0) return [`Re-experienced${latest.redoGained > 1 ? ` ×${latest.redoGained}` : ""}`];
    return latest.progressGained > 0 ? ["Progressed"] : [];

};

export const formatActivityProgress = (row: Pick<ActivityRow, "mediaType" | "progressGained">) =>
    `${formatNumber(toActivityDisplayValue(row.mediaType, row.progressGained), {
        locale: "en",
        maximumFractionDigits: 2
    })} ${getMediaDefinition(row.mediaType).progress.unit.short}`;

export const shiftActivityPeriod = (period: ActivityPeriod, offset: number): ActivityPeriod => {
    if (period.view === "year") return { ...period, year: period.year + offset };
    const date = new Date(Date.UTC(period.year, period.month - 1 + offset, 1));
    return { ...period, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
};

export const isFutureActivityPeriod = (period: ActivityPeriod, now = new Date()) =>
    period.year > now.getFullYear() || (period.view === "month" && period.year === now.getFullYear() && period.month > now.getMonth() + 1);

export const parseActivityAmount = (value: string) => value.trim() ? Number(value.replace(",", ".")) : NaN;
