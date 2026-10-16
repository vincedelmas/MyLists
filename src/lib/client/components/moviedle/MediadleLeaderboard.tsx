import {TableCell, TableHead} from "@/lib/client/components/ui/table";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {Leaderboard} from "@/lib/client/components/leaderboard/Leaderboard";
import type {mediadleLeaderboardOptions} from "@/lib/client/react-query/query-options";


type LeaderboardData = Awaited<ReturnType<typeof mediadleLeaderboardOptions.queryFn & {}>>;


interface MediadleLeaderboardProps {
    currentUserId?: number;
    leaderboard: LeaderboardData;
}


export const MediadleLeaderboard = ({ leaderboard, currentUserId }: MediadleLeaderboardProps) => {
    const { entries, currentUserEntry } = leaderboard;

    return (
        <Leaderboard
            entries={entries}
            currentUserId={currentUserId}
            currentUserEntry={currentUserEntry}
            description="The sharpest eyes in Mediadle, ranked all time."
            footer={currentUserId && !currentUserEntry
                ? "Complete your first Mediadle to earn a place in the ranking."
                : "Best streak and fewer attempts break ties."
            }
            columns={
                <>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground">
                        Wins
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground max-sm:hidden">
                        Win rate
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground">
                        Streak
                    </TableHead>
                    <TableHead className="pr-4 text-right text-xs uppercase tracking-widest text-muted-foreground max-md:hidden">
                        Avg. tries
                    </TableHead>
                </>
            }
            renderCells={(entry) =>
                <>
                    <TableCell className="text-right font-semibold tabular-nums">
                        {entry.totalWon}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums max-sm:hidden">
                        {formatPercent(entry.winRate, { fractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                        {entry.currentStreak}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground tabular-nums max-md:hidden">
                        {formatNumber(entry.averageAttempts, { fractionDigits: 1, locale: "en" })}
                    </TableCell>
                </>
            }
        />
    );
};
