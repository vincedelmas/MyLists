import {Award} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {getDifficultyColors} from "@/lib/utils/theme-utils";
import {Button} from "@/lib/client/components/ui/button";
import {AchievementsType} from "@/lib/types/query.options.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface AchievementsProps {
    username: string;
    achievements: AchievementsType;
}


export const AchievementsCard = ({ username, achievements }: AchievementsProps) => {
    return (
        <Card className={cn("h-fit", achievements.length === 0 && "h-fit")}>
            <CardHeader>
                <CardTitle>
                    Recent Achievements
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {achievements.length === 0 ?
                        <EmptyState
                            icon={Award}
                            message="No achievements earned yet."
                        />
                        :
                        achievements.map((ach) =>
                            <div key={`${ach.id}-${ach.difficulty}`} className={`p-2 rounded-lg border ${getDifficultyColors(ach.difficulty, "border")}`}>
                                <div className="flex justify-between">
                                    <div className="flex gap-2 items-center mb-1">
                                        <Award className={cn("size-4", getDifficultyColors(ach.difficulty, "text"))}/>
                                        <div className="font-bold text-sm text-primary">
                                            {ach.name}
                                        </div>
                                    </div>
                                    <RelativeTime
                                        date={ach.completedAt}
                                        className="text-muted-foreground text-xs"
                                    />
                                </div>
                                <p className="text-xs opacity-80 mt-1">
                                    {ach.description}
                                </p>
                            </div>
                        )
                    }
                </div>
                {achievements.length !== 0 &&
                    <Button className="mt-4" variant="dashed" asChild>
                        <Link to="/achievements/$username" params={{ username }}>
                            View all achievements
                        </Link>
                    </Button>
                }
            </CardContent>
        </Card>
    );
};
