import {useMemo} from "react";
import {cn} from "@/lib/utils/classnames";
import {Award, Check} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {AchCard} from "@/lib/types/query.options.types";
import {diffColors} from "@/lib/utils/theme-utils";
import {Progress} from "@/lib/client/components/ui/progress";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {TiersDetails} from "@/lib/client/components/achievements/TierDetails";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface AchievementCardProps {
    achievement: AchCard;
}


export const AchievementCard = ({ achievement }: AchievementCardProps) => {
    const { name, mediaType, description, tiers } = achievement;

    const fullyCompleted = useMemo(() => tiers.length > 0 && tiers.every((tier) => tier.completed), [tiers]);

    const highestCompletedTier = useMemo(() => {
        const completed = tiers.filter((tier) => tier.completed);
        return completed.length > 0 ? completed[completed.length - 1] : undefined;
    }, [tiers]);

    const nextTier = useMemo(() => {
        if (fullyCompleted) return undefined;
        return tiers.find((tier) => !tier.completed);
    }, [tiers, fullyCompleted]);

    const displayDifficulty = highestCompletedTier?.difficulty;
    const iconColorClass = diffColors(displayDifficulty);
    const borderColorClass = diffColors(displayDifficulty, "border");

    const tierForProgressDisplay = nextTier ?? tiers[tiers.length - 1];
    const currentCount = tierForProgressDisplay?.count ?? 0;
    const progressValue = tierForProgressDisplay?.progress ?? 0;
    const criteriaCount = tierForProgressDisplay?.criteria.count ?? 0;

    return (
        <Card className={cn("px-4", borderColorClass)}>
            <CardHeader>
                <CardTitle>
                    <div className="flex items-center gap-2">
                        <Award className={cn("size-6", iconColorClass)}/>
                        <div className="flex flex-col">
                            {name}
                            <RelativeTime
                                date={highestCompletedTier?.completedAt}
                                className="text-xs font-medium text-muted-foreground"
                            />
                        </div>
                    </div>
                </CardTitle>
                <CardAction>
                    <Badge variant="secondary" className="capitalize">
                        {mediaType}
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
                <CardDescription className="line-clamp-2" title={description ?? ""}>
                    {description}
                </CardDescription>
                <div>
                    <div className="flex justify-between items-center mb-1 text-muted-foreground text-xs capitalize">
                        <span>
                            {nextTier?.difficulty ?
                                <div>
                                    Next: {nextTier.difficulty}{" "}
                                    <Award className={cn("size-3.5 inline-block", diffColors(nextTier.difficulty))}/>
                                </div>
                                :
                                <div className="text-app-accent">
                                    Completed{" "}
                                    <Check className="size-3.5 inline-block"/>
                                </div>
                            }
                        </span>
                        <p>{currentCount}/{criteriaCount} ({Math.round(currentCount / criteriaCount * 100)}%)</p>
                    </div>
                    <Progress
                        value={progressValue}
                        color={"rgba(216,216,216,0.89)"}
                    />
                </div>
                <TiersDetails
                    achievement={achievement}
                />
            </CardContent>
        </Card>
    );
};
