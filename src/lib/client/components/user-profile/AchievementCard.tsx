import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Award, Gem, Pin, Star, Trophy} from "lucide-react";
import {Progress} from "@/lib/client/components/ui/progress";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {AchievementsType} from "@/lib/types/query.options.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {AchievementBadge} from "@/lib/client/components/achievements/AchievementBadge";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {ACHIEVEMENT_CATEGORY_LABELS, getAchievementRarityTier} from "@/lib/utils/achievements";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface AchievementsProps {
    username: string;
    achievements: AchievementsType;
}


export const AchievementsCard = ({ username, achievements }: AchievementsProps) => {
    const completionPercent = achievements.totalAvailable > 0 ? (achievements.totalUnlocked / achievements.totalAvailable) * 100 : 0;

    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {achievements.mode === "pinned"
                        ? <><Pin className="size-4 text-brand"/> Featured Achievements</>
                        : <><Trophy className="size-4 text-gold"/> Achievements</>
                    }
                </CardTitle>

                {achievements.perfectCategories.length > 0 &&
                    <CardAction>
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand/35 bg-brand/10
                        px-2 py-0.5 text-[11px] font-semibold text-brand">
                            <Star className="size-3 fill-current"/>
                            {achievements.perfectCategories.length} Perfect
                        </span>
                    </CardAction>
                }
            </CardHeader>

            <CardContent className="space-y-4">
                {achievements.items.length === 0 ?
                    <EmptyState
                        icon={Award}
                        message="No achievements unlocked yet."
                    />
                    :
                    <>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-3 py-1">
                            {achievements.items.map((ach) => {
                                const tier = getAchievementRarityTier(ach.rarity);
                                const hasRarity = ach.rarity !== null && ach.rarity > 0;

                                const isRare = tier === "rare" && hasRarity;
                                const isUltra = tier === "ultra" && hasRarity;

                                return (
                                    <Tooltip key={ach.id}>
                                        <TooltipTrigger
                                            render={
                                                <Link
                                                    params={{ username }}
                                                    aria-label={ach.name}
                                                    to="/achievements/$username"
                                                    hash={`ach-${ach.codeName}`}
                                                    search={{ activeTab: ach.category }}
                                                    className="group/badge flex flex-col items-center gap-1.5 rounded-lg py-1.5
                                                    text-center transition-transform hover:scale-105"
                                                />
                                            }
                                        >
                                            <AchievementBadge
                                                size="md"
                                                unlocked={true}
                                                icon={ach.icon}
                                                shape={ach.shape}
                                                rarity={ach.rarity}
                                                pattern={ach.pattern}
                                                category={ach.category}
                                            />
                                            <span
                                                className={cn("inline-flex items-center gap-0.5 text-[10.5px] font-bold tabular-nums",
                                                    isUltra ? "text-platinum" : isRare ? "text-gold" : "text-muted-foreground")}
                                            >
                                                {isUltra && <Gem className="size-2.5"/>}
                                                {isRare && <Star className="size-2.5 fill-current"/>}
                                                {hasRarity ? formatPercent(ach.rarity) : "New"}
                                            </span>
                                        </TooltipTrigger>

                                        <TooltipContent
                                            side="top"
                                            variant="popover"
                                            className="flex max-w-60 flex-col items-start gap-1 p-3 text-left"
                                        >
                                            <div className="flex w-full items-center justify-between gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {ach.name}
                                                </span>
                                                {hasRarity && (
                                                    <span className={cn("shrink-0 text-[10px] font-bold tabular-nums",
                                                        isUltra ? "text-platinum" : isRare ? "text-gold" : "text-muted-foreground")}
                                                    >
                                                        {formatPercent(ach.rarity)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                {ach.description}
                                            </p>
                                            <div className="pt-0.5 text-[11px] font-medium text-brand">
                                                {ach.metadata?.label ?? ACHIEVEMENT_CATEGORY_LABELS[ach.category]}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>

                        <div className="space-y-1.5 border-t pt-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-foreground tabular-nums">
                                    {formatNumber(achievements.totalUnlocked)}/{formatNumber(achievements.totalAvailable)} unlocked
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                    {formatPercent(completionPercent, { fractionDigits: 0 })}
                                    {achievements.rareUnlocked > 0 && ` · ${formatNumber(achievements.rareUnlocked)} rare`}
                                </span>
                            </div>
                            <Progress
                                color="var(--brand)"
                                value={completionPercent}
                                aria-label="Achievement completion"
                            />
                        </div>
                    </>
                }

                <Link to="/achievements/$username" params={{ username }} className={buttonVariants({ variant: "dashed" })}>
                    View all Achievements
                </Link>
            </CardContent>
        </Card>
    );
};
