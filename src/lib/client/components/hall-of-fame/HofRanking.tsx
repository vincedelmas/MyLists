import {cn} from "@/lib/utils/classnames";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {capitalize} from "@/lib/utils/text-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {HofUserRank} from "@/lib/types/query.options.types";
import {formatPercent} from "@/lib/utils/number-formatting";
import {Progress} from "@/lib/client/components/ui/progress";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Ban, ChartNoAxesColumnIncreasing, TrendingUp} from "lucide-react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface HofRankingProps {
    userRanks: HofUserRank;
}


export const HofRanking = ({ userRanks }: HofRankingProps) => {
    return (
        <section className="h-full rounded-xl border p-5 shadow-xs sm:p-6">
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true"/>
                    Your standing
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    Across every list
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Your position in each of the six media types.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-y-5">
                    {userRanks.map((rank, idx) =>
                        <div key={rank.mediaType} className={cn("min-w-0", idx % 2 === 0 && "pr-5", idx % 2 === 1 && "border-l pl-5")}>
                            <div className="flex items-center gap-2 text-sm">
                                <MainThemeIcon type={rank.mediaType} size={15}/>
                                <span className="truncate capitalize text-muted-foreground">
                                    {rank.mediaType}
                                </span>
                            </div>
                            {rank.active
                                ?
                                <>
                                    <div className="mt-2 text-xl font-semibold tabular-nums">
                                        #{rank.rank ?? <>{DEFAULT_DASH_FALLBACK}</>}
                                    </div>
                                    <Progress
                                        className="mt-2"
                                        value={100 - (rank.percent ?? 100)}
                                        color={getThemeColor(rank.mediaType)}
                                        aria-label={`${capitalize(rank.mediaType)} rank ${rank.rank ?? "unavailable"}`}
                                    />
                                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <TrendingUp className="size-3 text-brand" aria-hidden="true"/>
                                        {rank.percent
                                            ? <>Top {formatPercent(rank.percent)}</>
                                            : <>Percentile unavailable</>
                                        }
                                    </div>
                                </>
                                :
                                <Badge className="mt-3" variant="secondary">
                                    <Ban data-icon="inline-start"/>
                                    Inactive
                                </Badge>
                            }
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
