import {Award} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {capitalize} from "@/lib/utils/text-formatting";
import {AchCard} from "@/lib/types/query.options.types";
import {Button} from "@/lib/client/components/ui/button";
import {Progress} from "@/lib/client/components/ui/progress";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {getDifficultyColors} from "@/lib/utils/theme-utils";
import {formatPercent} from "@/lib/utils/number-formatting";


interface TierDetailsProps {
    achievement: AchCard;
}


export const TiersDetails = ({ achievement }: TierDetailsProps) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                    View Tiers
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full" align="center">
                <h3 className="font-semibold mb-2">{achievement.name} Tiers</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tier</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Rarity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {achievement.tiers.map((tier) => {
                            const iconColorClass = getDifficultyColors(tier.difficulty);

                            return (
                                <TableRow key={tier.id}>
                                    <TableCell className="text-xs">
                                        <div className="flex items-center gap-1">
                                            <Award className={cn("size-4", iconColorClass)}/>
                                            {capitalize(tier.difficulty)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Progress
                                                className="w-24 h-2"
                                                value={tier.progress}
                                                color={"rgba(216,216,216,0.89)"}
                                            />
                                            <span className="text-xs">
                                                {tier.count}/{tier.criteria.count}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-end text-xs">
                                        {tier.rarity ? formatPercent(tier.rarity) : "- %"}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </PopoverContent>
        </Popover>
    );
};
