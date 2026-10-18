import {formatMs} from "@/lib/utils/formatting/number";


export function formatImportProcessingTime(durationMs: number | null) {
    if (durationMs === null) return "Not started";
    if (durationMs === 0) return "<1s";

    return formatMs(durationMs);
}
