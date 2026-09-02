import {Award} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {capitalize} from "@/lib/utils/text-formatting";
import {AchSummary} from "@/lib/types/query.options.types";
import {getDifficultyColors} from "@/lib/utils/theme-utils";


interface AchievementSummaryProps {
    summary: AchSummary;
}


export const AchievementSummary = ({ summary }: AchievementSummaryProps) => {
    return (
        <section aria-label="Achievement summary" className="mt-6 rounded-xl border p-5 shadow-xs sm:p-6">
            <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                {summary.map((item, index) => {
                    const isTotal = item.tier === "total";
                    const tierColor = item.tier === "total" ? "text-brand" : getDifficultyColors(item.tier);

                    return (
                        <div
                            key={item.tier}
                            className={cn(
                                "flex min-w-0 items-start gap-3",
                                index % 2 === 1 && "border-l pl-4",
                                index % 3 === 0 ? "sm:border-l-0 sm:pl-0" : "sm:border-l sm:pl-5",
                                index % 5 === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-5",
                            )}
                        >
                            <Award
                                aria-hidden="true"
                                className={cn("mt-1 size-4 shrink-0", tierColor)}
                            />
                            <div className="min-w-0">
                                <div className="wrap-break-word text-xl font-black tabular-nums">
                                    {item.count}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {isTotal ? "Overall progress" : capitalize(item.tier)}
                                </div>
                                <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground/80">
                                    {isTotal ? "achievements earned" : "highest tier earned"}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
