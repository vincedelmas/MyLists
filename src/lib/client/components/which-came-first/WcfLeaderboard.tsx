import {TableCell, TableHead} from "@/lib/client/components/ui/table";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {Leaderboard} from "@/lib/client/components/leaderboard/Leaderboard";
import type {whichCameFirstOptions} from "@/lib/client/react-query/query-options/wcf.options";


type LeaderboardData = GameData["leaderboard"];
type GameData = Awaited<ReturnType<NonNullable<typeof whichCameFirstOptions.queryFn>>>;


interface WcfLeaderboardProps {
    leaderboard: LeaderboardData;
}


export const WcfLeaderboard = ({ leaderboard }: WcfLeaderboardProps) => {
    const { entries, currentUserEntry } = leaderboard;

    return (
        <Leaderboard
            entries={entries}
            currentUserEntry={currentUserEntry}
            currentUserId={currentUserEntry?.userId}
            description="Release-date experts, ranked across completed runs."
            footer={!currentUserEntry
                ? "Complete your first run to earn a place in the ranking."
                : "Best score, perfect clears, average score, then runs break ties."
            }
            columns={
                <>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground">
                        Best
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground max-lg:hidden">
                        Accuracy
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground max-sm:hidden">
                        Clears
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground max-md:hidden">
                        Avg. score
                    </TableHead>
                    <TableHead className="pr-4 text-right text-xs uppercase tracking-widest text-muted-foreground">
                        Runs
                    </TableHead>
                </>
            }
            renderCells={(entry) =>
                <>
                    <TableCell className="text-right font-semibold tabular-nums">
                        {entry.bestScore}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums max-lg:hidden">
                        {formatPercent(entry.accuracy, { fractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums max-sm:hidden">
                        {entry.perfectRuns}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums max-md:hidden">
                        {formatNumber(entry.averageScore, { fractionDigits: 1, locale: "en" })}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                        {entry.runsPlayed}
                    </TableCell>
                </>
            }
        />
    );
};
