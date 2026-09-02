import {cn} from "@/lib/utils/classnames";
import {Award, Check} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {AchCard} from "@/lib/types/query.options.types";
import {getDifficultyColors} from "@/lib/utils/theme-utils";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {TiersDetails} from "@/lib/client/components/achievements/TierDetails";
import {Progress, ProgressLabel, ProgressValue} from "@/lib/client/components/ui/progress";


interface AchievementCardProps {
    achievement: AchCard;
}


export const AchievementCard = ({ achievement }: AchievementCardProps) => {
    const { name, mediaType, description, tiers } = achievement;

    const completedTiers = tiers.filter((tier) => tier.completed);
    const fullyCompleted = tiers.length > 0 && tiers.every((tier) => tier.completed);
    const nextTier = fullyCompleted ? undefined : tiers.find((tier) => !tier.completed);
    const highestCompletedTier = completedTiers.length > 0 ? completedTiers[completedTiers.length - 1] : undefined;

    const displayDifficulty = highestCompletedTier?.difficulty;
    const iconColorClass = getDifficultyColors(displayDifficulty);
    const tierForProgressDisplay = nextTier ?? tiers[tiers.length - 1];
    const progressValue = tierForProgressDisplay?.progress ?? 0;
    const progressColor = fullyCompleted || !nextTier ? "var(--brand)" : `var(--${nextTier.difficulty})`;

    return (
        <article className="flex h-full min-w-0 flex-col rounded-xl border bg-popover p-4 shadow-xs transition-colors hover:border-brand/35">
            <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" className="capitalize">
                    <MainThemeIcon className="text-brand" type={mediaType}/>
                    {mediaType}
                </Badge>
                <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {completedTiers.length}/{tiers.length} tiers
                </span>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-2.5">
                <Award className={cn("size-5 shrink-0", iconColorClass || "text-muted-foreground/60")}/>
                <h3 className="truncate text-base font-semibold tracking-tight" title={name}>
                    {name}
                </h3>
            </div>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground" title={description ?? ""}>
                {description}
            </p>

            <div className="mt-auto pt-5">
                <Progress value={progressValue} color={progressColor}>
                    <ProgressLabel className="text-xs">
                        {nextTier
                            ? <>Next · <span className={getDifficultyColors(nextTier.difficulty)}>{capitalize(nextTier.difficulty)}</span></>
                            : <span className="flex items-center gap-1 text-brand"><Check className="size-3.5"/> Completed</span>
                        }
                    </ProgressLabel>
                    <ProgressValue className="text-xs"/>
                </Progress>

                <div className="mt-3 flex min-h-7 items-center justify-between gap-3 border-t pt-2">
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        {highestCompletedTier
                            ? <>
                                <span className={cn("shrink-0 font-medium capitalize", iconColorClass)}>
                                    {highestCompletedTier.difficulty}
                                </span>
                                <span aria-hidden="true">·</span>
                                <RelativeTime
                                    date={highestCompletedTier.completedAt}
                                    className="max-w-full truncate text-xs text-muted-foreground"
                                />
                            </>
                            : <span>No tier earned yet</span>
                        }
                    </div>
                    <TiersDetails achievement={achievement}/>
                </div>
            </div>
        </article>
    );
};
