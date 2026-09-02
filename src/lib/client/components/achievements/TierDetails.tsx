import {Award, Check, ChevronRight} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {AchCard} from "@/lib/types/query.options.types";
import {Button} from "@/lib/client/components/ui/button";
import {Progress} from "@/lib/client/components/ui/progress";
import {getDifficultyColors} from "@/lib/utils/theme-utils";
import {formatPercent} from "@/lib/utils/number-formatting";
import {Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger,} from "@/lib/client/components/ui/popover";


interface TierDetailsProps {
    achievement: AchCard;
}


export const TiersDetails = ({ achievement }: TierDetailsProps) => {
    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        size="sm"
                        variant="ghost"
                        className="-mr-2 text-xs text-muted-foreground aria-expanded:bg-muted/40"
                    />
                }
            >
                View tiers
                <ChevronRight data-icon="inline-end"/>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                positionMethod="fixed"
                className="w-[min(25rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
            >
                <PopoverHeader className="border-b px-4 py-3">
                    <PopoverTitle>{achievement.name}</PopoverTitle>
                    <PopoverDescription>Progress and rarity across every tier.</PopoverDescription>
                </PopoverHeader>

                <div className="divide-y">
                    {achievement.tiers.map((tier) =>
                        <div key={tier.id} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Award className={cn("size-4", getDifficultyColors(tier.difficulty))}/>
                                <span className="text-xs font-semibold capitalize">
                                    {tier.difficulty}
                                </span>
                                {tier.completed && <Check className="size-3.5 text-brand" aria-label="Completed"/>}
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {tier.rarity ? `${formatPercent(tier.rarity)} rarity` : "Never reached"}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                                <Progress
                                    className="min-w-0 flex-1"
                                    value={tier.progress}
                                    color={`var(--${tier.difficulty})`}
                                />
                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                    {tier.count}/{tier.criteria.count}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
