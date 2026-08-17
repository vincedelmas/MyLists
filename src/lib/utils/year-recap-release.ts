import type {YearRecapReleaseMode, YearRecapReleaseStatus} from "@/lib/types/year-recap.types";


export const getYearRecapReleaseStatus = (year: number, mode: YearRecapReleaseMode, now = new Date()): YearRecapReleaseStatus => {
    const currentYear = now.getUTCFullYear();
    const automaticReleaseAt = new Date(Date.UTC(year, 11, 20));

    return {
        year,
        mode,
        automaticReleaseAt: automaticReleaseAt.toISOString(),
        isAvailable: year <= currentYear && (mode === "enabled" || (mode === "automatic" && now >= automaticReleaseAt)),
    };
};
