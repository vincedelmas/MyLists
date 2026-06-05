import React from "react";
import {Ban, TrendingUp} from "lucide-react";
import {capitalize} from "@/lib/utils/text-formatting";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {HofUserRank} from "@/lib/types/query.options.types";
import {Progress} from "@/lib/client/components/ui/progress";
import {Card, CardContent} from "@/lib/client/components/ui/card";
import {formatPercent} from "@/lib/utils/number-formatting";


interface HofRankingProps {
    userRanks: HofUserRank;
}


export const HofRanking = ({ userRanks }: HofRankingProps) => {
    return (
        <>
            <div className="text-xl font-semibold mb-3">
                My Rankings
            </div>
            <div className="grid grid-cols-2 w-full gap-3">
                {userRanks.map((rank) =>
                    <Card key={rank.mediaType} className="p-2 max-sm:py-0 bg-card">
                        {rank.active ?
                            <CardContent className="max-sm:py-4 p-2">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="font-semibold text-lg">
                                        {capitalize(rank.mediaType)}
                                    </div>
                                    <div className="font-semibold text-xl">
                                        # {rank.rank}
                                    </div>
                                </div>
                                <Progress
                                    max={100}
                                    className="mt-1.5"
                                    color={getThemeColor(rank.mediaType)}
                                    value={100 - (rank.percent ? rank.percent : 100)}
                                />
                                <div className="text-xs font-semibold mt-2">
                                    <div className="flex items-center gap-1">
                                        <TrendingUp className="text-app-accent size-4"/>
                                        {rank.percent
                                            ? <>Top {formatPercent(rank.percent)}</>
                                            : <>Top - %</>
                                        }
                                    </div>
                                </div>
                            </CardContent>
                            :
                            <CardContent className="max-sm:py-4 p-2 space-y-2">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="font-semibold text-lg">
                                        {capitalize(rank.mediaType)}
                                    </div>
                                </div>
                                <div className="flex gap-1 items-center text-xs text-muted-foreground">
                                    <Ban size={14}/> Not Activated
                                </div>
                            </CardContent>
                        }
                    </Card>
                )}
            </div>
        </>
    );
};
