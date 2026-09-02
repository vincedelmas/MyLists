import {UpdateType} from "@/lib/utils/enums";
import {getUpdateTypeColor} from "@/lib/utils/theme-utils";
import {formatDate} from "@/lib/utils/date-formatting";
import {UserStatsResult} from "@/lib/types/stats.types";
import {CalendarCheck2, History, ListRestart} from "lucide-react";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";


interface UpdatesDialProps {
    fingerprint: UserStatsResult["updateFingerprint"];
}


const updatesLabels: Record<UpdateType, string> = {
    [UpdateType.REDO]: "Repeats",
    [UpdateType.RATING]: "Ratings",
    [UpdateType.COMMENT]: "Comments",
    [UpdateType.FAVORITE]: "Favorites",
    [UpdateType.PAGE]: "Page progress",
    [UpdateType.TV]: "Episode progress",
    [UpdateType.STATUS]: "Status changes",
    [UpdateType.CHAPTER]: "Chapter progress",
    [UpdateType.PLAYTIME]: "Playtime updates",
    [UpdateType.PLATFORM]: "Platform changes",
};


export function UpdatesDial({ fingerprint }: UpdatesDialProps) {
    let cursor = 0;
    const dominant = fingerprint.updateTypes[0];
    const total = fingerprint.updateTypes.reduce((sum, item) => sum + item.value, 0);

    const gradient = fingerprint.updateTypes.map((item) => {
        const start = total > 0 ? (cursor / total) * 100 : 0;
        cursor += item.value;
        const end = total > 0 ? (cursor / total) * 100 : 0;
        return `${getUpdateTypeColor(item.updateType)} ${start}% ${end}%`;
    }).join(", ");

    return (
        <div className="grid h-fit gap-7 rounded-xl border p-5 shadow-xs sm:grid-cols-[180px_1fr] sm:p-7">
            <div
                className="relative mx-auto grid size-44 place-items-center rounded-full"
                style={{ background: total > 0 ? `conic-gradient(${gradient})` : "var(--muted)" }}
            >
                <div className="grid size-28 place-items-center rounded-full border bg-card text-center shadow-inner">
                    <div>
                        <div className="text-xl font-black tabular-nums">
                            {formatNumber(total)}
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            updates
                        </div>
                    </div>
                </div>
            </div>

            <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Most common update
                </div>
                <div className="mt-1 text-xl font-bold tracking-tight">
                    {dominant ? updatesLabels[dominant.updateType] : "No updates recorded"}
                </div>
                {dominant &&
                    <div className="mt-1 text-sm text-muted-foreground">
                        {formatPercent(total > 0 ? (dominant.value / total) * 100 : 0)} of recorded updates
                    </div>
                }

                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                    {fingerprint.updateTypes.map((item) =>
                        <div key={item.updateType} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: getUpdateTypeColor(item.updateType) }}
                            />
                            {updatesLabels[item.updateType]} · {formatNumber(item.value)}
                        </div>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5">
                    <div>
                        <CalendarCheck2 className="mb-2 size-4 text-brand"/>
                        <div className="font-semibold">
                            {formatNumber(fingerprint.activeDays)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            active days
                        </div>
                    </div>
                    <div>
                        <History className="mb-2 size-4 text-brand"/>
                        <div className="truncate font-semibold">
                            {formatDate(fingerprint.firstUpdateAt)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            first update
                        </div>
                    </div>
                    <div className="col-span-2 flex items-start gap-3 border-t pt-4">
                        <ListRestart className="mt-0.5 size-4 shrink-0 text-brand"/>
                        <div className="min-w-0">
                            <div className="font-semibold wrap-break-word">
                                {fingerprint.mostTouched?.mediaName ?? "—"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                most updated
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
