import {getThemeColor} from "@/lib/utils/theme-utils";
import {ExtractStatsByType} from "@/lib/types/stats.types";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {formatAvgRating} from "@/lib/utils/ratings-formatting";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";


interface MediaConstellationProps {
    ratingSystem: RatingSystemType;
    media: ExtractStatsByType<null>["mediaBreakdown"];
    onSelectMediaType?: (mediaType: MediaType) => void;
}


const positionsByMediaCount: Record<number, { left: number; top: number }[]> = {
    1: [{ left: 50, top: 50 }],
    2: [{ left: 30, top: 50 }, { left: 70, top: 50 }],
    3: [{ left: 22, top: 36 }, { left: 50, top: 72 }, { left: 78, top: 36 }],
    4: [{ left: 30, top: 30 }, { left: 70, top: 30 }, { left: 70, top: 72 }, { left: 30, top: 72 }],
    5: [{ left: 50, top: 22 }, { left: 78, top: 42 }, { left: 67, top: 76 }, { left: 33, top: 76 }, { left: 22, top: 42 }],
    6: [{ left: 20, top: 30 }, { left: 50, top: 22 }, { left: 80, top: 30 }, { left: 80, top: 70 }, { left: 50, top: 78 }, { left: 20, top: 70 }],
};


export function MediaConstellation({ media, ratingSystem, onSelectMediaType }: MediaConstellationProps) {
    const totalHours = media.reduce((sum, item) => sum + item.timeSpentHours, 0);
    const positions = positionsByMediaCount[media.length] ?? positionsByMediaCount[6];

    return (
        <div
            className="relative h-107.5 rounded-xl border bg-[radial-gradient(circle_at_center,var(--color-muted)_0,transparent_1px)] shadow-xs
            bg-size-[22px_22px] max-sm:h-97.5"
        >
            <div
                className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2
                rounded-full border border-dashed opacity-45"
            />
            <div
                className="pointer-events-none absolute left-1/2 top-1/2 size-120 -translate-x-1/2 -translate-y-1/2
                rounded-full border border-dashed opacity-25"
            />

            <svg className="pointer-events-none absolute inset-0 size-full opacity-30" aria-hidden="true">
                {positions.length > 1 && positions.map((position, idx) => {
                    if (positions.length === 2 && idx === 1) return null;
                    const nextPosition = positions[(idx + 1) % positions.length];

                    return (
                        <line
                            stroke="currentColor"
                            strokeDasharray="3 7"
                            y1={`${position.top}%`}
                            x1={`${position.left}%`}
                            y2={`${nextPosition.top}%`}
                            x2={`${nextPosition.left}%`}
                            key={`${position.left}-${position.top}`}
                        />
                    );
                })}
            </svg>

            {media.map((item, index) => {
                const position = positions[index];
                const mtColor = getThemeColor(item.mediaType);

                const share = totalHours > 0 ? (item.timeSpentHours / totalHours) * 100 : 0;
                const size = Math.min(150, 66 + Math.sqrt(share / 100) * 112);

                return (
                    <button
                        type="button"
                        key={item.mediaType}
                        disabled={!onSelectMediaType}
                        aria-label={`Explore ${item.mediaType} statistics`}
                        onClick={() => onSelectMediaType?.(item.mediaType)}
                        className="group absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full
                        border text-center shadow-lg transition-all enabled:hover:z-10 enabled:hover:scale-110
                        disabled:cursor-default"
                        style={{
                            width: size,
                            height: size,
                            top: `${position.top}%`,
                            left: `${position.left}%`,
                            borderColor: `color-mix(in oklch, ${mtColor} 80%, var(--border))`,
                            backgroundColor: `color-mix(in oklch, ${mtColor} 24%, var(--popover))`,
                        }}
                    >
                        <span className="flex flex-col items-center px-2">
                            <MainThemeIcon
                                type={item.mediaType}
                                size={size > 105 ? 22 : 17}
                            />
                            <span className="mt-1 text-xs font-semibold capitalize sm:text-sm">
                                {item.mediaType}
                            </span>
                            <span className="mt-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
                                {formatPercent(share, { fractionDigits: 0 })}
                            </span>
                            {size > 105 &&
                                <span className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
                                    {formatHours(item.timeSpentHours)} · {formatNumber(item.totalEntries)}
                                </span>
                            }
                        </span>
                        <span
                            className="pointer-events-none absolute top-full z-20 mt-2 hidden w-36 rounded-xl border
                            bg-popover p-2 text-[10px] text-popover-foreground shadow-xl group-hover:block">
                            {formatAvgRating(ratingSystem, item.avgRating)} avg. · {formatPercent(item.ratingCoverage)} rated
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
