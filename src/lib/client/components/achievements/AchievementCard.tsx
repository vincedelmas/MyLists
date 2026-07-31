import {cn} from "@/lib/utils/classnames";
import {Award, Check} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {AchCard} from "@/lib/types/query.options.types";
import {getDifficultyColors} from "@/lib/utils/theme-utils";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {TiersDetails} from "@/lib/client/components/achievements/TierDetails";
import {Progress, ProgressLabel, ProgressValue} from "@/lib/client/components/ui/progress";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


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
    const ringColorClass = getDifficultyColors(displayDifficulty, "ring");

    const tierForProgressDisplay = nextTier ?? tiers[tiers.length - 1];
    const progressValue = tierForProgressDisplay?.progress ?? 0;

    return (
        <Card className={ringColorClass}>
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
                    <Badge variant="outline" className="capitalize">
                        <MainThemeIcon type={mediaType}/> {mediaType}
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
                <CardDescription className="line-clamp-2" title={description ?? ""}>
                    {description}
                </CardDescription>
                <Progress value={progressValue} color="var(--app-accent)">
                    <ProgressLabel>
                        {nextTier?.difficulty ?
                            <div>
                                Next: {capitalize(nextTier.difficulty)}{" "}
                                <Award className={cn("size-3.5 inline-block", getDifficultyColors(nextTier.difficulty))}/>
                            </div>
                            :
                            <div className="text-app-accent">
                                Completed{" "}
                                <Check className="size-3.5 inline-block"/>
                            </div>
                        }
                    </ProgressLabel>
                    <ProgressValue/>
                </Progress>
                <TiersDetails
                    achievement={achievement}
                />
            </CardContent>
        </Card>
    );
};
