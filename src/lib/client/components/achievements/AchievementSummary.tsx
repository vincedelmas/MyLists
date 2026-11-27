import {cn} from "@/lib/utils/classnames";
import {Award, Gem, Star, Trophy} from "lucide-react";
import {AchSummary} from "@/lib/types/query.options.types";
import {Progress} from "@/lib/client/components/ui/progress";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {AchievementBadge} from "@/lib/client/components/achievements/AchievementBadge";
import {ACHIEVEMENT_CATEGORY_LABELS, getAchievementRarityTier} from "@/lib/utils/achievements";


interface AchievementSummaryProps {
    summary: AchSummary;
}


export const AchievementSummary = ({ summary }: AchievementSummaryProps) => {
    const rarestHasValue = Boolean(summary.rarestUnlocked?.rarity && summary.rarestUnlocked.rarity > 0);
    const rarestTier = summary.rarestUnlocked ? getAchievementRarityTier(summary.rarestUnlocked.rarity) : "common";

    return (
        <section aria-label="Achievement summary" className="mt-5 overflow-hidden rounded-xl border shadow-xs">
            <div className="grid gap-y-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_auto_auto_minmax(13rem,0.9fr)] lg:items-center">
                <div className="space-y-2.5 lg:pr-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                                {formatNumber(summary.totalUnlocked)}
                                <span className="text-base font-semibold text-muted-foreground">
                                    /{formatNumber(summary.totalAvailable)}
                                </span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Overall
                            </span>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-brand">
                            {formatPercent(summary.completionPercent, { fractionDigits: 0 })}
                        </span>
                    </div>

                    <Progress
                        color="var(--brand)"
                        value={summary.completionPercent}
                        aria-label="Overall achievement completion"
                    />

                    {summary.perfectCategories.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                            <span className="inline-flex items-center gap-1 font-semibold text-brand">
                                <Trophy className="size-3.5"/>
                                100%:
                            </span>
                            {summary.perfectCategories.map((category) => (
                                <span
                                    key={category}
                                    className="rounded-md border border-brand/30 bg-brand/8 px-2 py-0.5 text-[11px] font-medium text-foreground"
                                >
                                    {ACHIEVEMENT_CATEGORY_LABELS[category]}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4 lg:contents">
                    <div className="flex items-start gap-2.5 lg:border-l lg:px-6">
                        <Star className="mt-1 size-4 shrink-0 text-gold"/>
                        <div>
                            <div className="text-xl font-black tabular-nums text-foreground">
                                {formatNumber(summary.rareUnlocked)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Rare (&lt;10%)
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-l pl-4 lg:px-6">
                        <Gem className="mt-1 size-4 shrink-0 text-platinum"/>
                        <div>
                            <div className="text-xl font-black tabular-nums text-foreground">
                                {formatNumber(summary.ultraRareUnlocked)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Ultra (&lt;3%)
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    {summary.rarestUnlocked ? (
                        <>
                            <AchievementBadge
                                size="xs"
                                unlocked={true}
                                icon={summary.rarestUnlocked.icon}
                                shape={summary.rarestUnlocked.shape}
                                rarity={summary.rarestUnlocked.rarity}
                                pattern={summary.rarestUnlocked.pattern}
                                category={summary.rarestUnlocked.category}
                            />
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    Rarest trophy
                                </div>
                                <div className="truncate text-sm font-semibold text-foreground" title={summary.rarestUnlocked.name}>
                                    {summary.rarestUnlocked.name}
                                </div>
                                <div
                                    className={cn(
                                        "text-xs font-semibold tabular-nums",
                                        rarestTier === "ultra" && rarestHasValue
                                            ? "text-platinum"
                                            : rarestTier === "rare" && rarestHasValue
                                                ? "text-gold"
                                                : "text-muted-foreground",
                                    )}
                                >
                                    {rarestHasValue
                                        ? `${formatPercent(summary.rarestUnlocked.rarity)} of users`
                                        : "Recently unlocked"
                                    }
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Award className="size-4 shrink-0"/>
                            <span>
                                No trophies unlocked yet
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
