import {Trophy} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {whichCameFirstOptions} from "@/lib/client/react-query/query-options/wcf.options";
import {Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


type LeaderboardData = GameData["leaderboard"];
type LeaderboardEntry = LeaderboardData["entries"][number];
type GameData = Awaited<ReturnType<NonNullable<typeof whichCameFirstOptions.queryFn>>>;


interface LeaderboardRowProps {
    isPinned?: boolean;
    isCurrentUser: boolean;
    entry: LeaderboardEntry;
}


const LeaderboardRow = ({ entry, isCurrentUser, isPinned = false }: LeaderboardRowProps) => {
    const placesFromTopTen = entry.rank - 10;

    return (
        <TableRow
            aria-current={isCurrentUser ? "true" : undefined}
            className={cn(
                "group/leaderboard border-border/60",
                entry.rank === 1 && "bg-gold/5 hover:bg-gold/10",
                isCurrentUser && "bg-primary/5 hover:bg-primary/10",
            )}
        >
            <TableCell className="pl-4 text-center">
                <div className={cn(
                    "mx-auto flex size-7 items-center justify-center rounded-full font-mono text-xs " +
                    "font-semibold text-muted-foreground",
                    entry.rank === 1 && "bg-gold/15 text-gold",
                    entry.rank === 2 && "bg-silver/15 text-silver",
                    entry.rank === 3 && "bg-bronze/15 text-bronze",
                )}>
                    {entry.rank <= 3
                        ?
                        <>
                            <Trophy className="size-3.5" aria-hidden="true"/>
                            <span className="sr-only">{entry.rank}</span>
                        </>
                        :
                        entry.rank
                    }
                </div>
            </TableCell>
            <TableCell>
                <div className="flex w-36 items-center gap-2.5 sm:w-auto sm:min-w-36">
                    <ProfileIcon
                        fallbackSize="text-xs"
                        className="size-8 border shadow-none"
                        user={{ image: entry.image, name: entry.name }}
                    />
                    <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                            <Link to="/profile/$username" className="min-w-0 truncate" params={{ username: entry.name }}>
                                {entry.name}
                            </Link>
                            {isCurrentUser &&
                                <Badge className="shrink-0" variant="secondary">
                                    You
                                </Badge>
                            }
                        </div>
                        {isPinned &&
                            <p className="truncate text-xs text-muted-foreground">
                                {placesFromTopTen} {placesFromTopTen === 1 ? "place" : "places"} from the top 10
                            </p>
                        }
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
                {entry.bestScore}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground tabular-nums max-lg:hidden">
                {formatPercent(entry.accuracy, { fractionDigits: 0 })}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground tabular-nums max-sm:hidden">
                {entry.perfectRuns}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground tabular-nums max-md:hidden">
                {formatNumber(entry.averageScore, { fractionDigits: 1, locale: "en" })}
            </TableCell>
            <TableCell className="pr-4 text-right font-mono tabular-nums">
                {entry.runsPlayed}
            </TableCell>
        </TableRow>
    );
};


interface WcfLeaderboardProps {
    leaderboard: LeaderboardData;
}


export const WcfLeaderboard = ({ leaderboard }: WcfLeaderboardProps) => {
    const { entries, currentUserEntry } = leaderboard;
    const currentUserId = currentUserEntry?.userId;

    return (
        <Card className="mt-8">
            <CardHeader className="border-b">
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>
                    Release-date experts, ranked across completed runs.
                </CardDescription>
                <CardAction>
                    <Badge variant="outline">
                        <Trophy data-icon="inline-start"/>
                        Top 10
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="px-0">
                {entries.length === 0
                    ?
                    <EmptyState
                        icon={Trophy}
                        iconSize={20}
                        className="min-h-32"
                        message="The first spot is waiting to be claimed :D."
                    />
                    :
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-14 pl-4 text-center text-xs uppercase tracking-widest text-muted-foreground">
                                    Rank
                                </TableHead>
                                <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">
                                    Player
                                </TableHead>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) =>
                                <LeaderboardRow
                                    entry={entry}
                                    key={entry.userId}
                                    isCurrentUser={entry.userId === currentUserId}
                                />
                            )}
                        </TableBody>
                        {currentUserEntry && currentUserEntry.rank > 10 &&
                            <TableFooter className="border-t-2 border-primary/20 bg-primary/5">
                                <LeaderboardRow
                                    isPinned
                                    isCurrentUser={true}
                                    entry={currentUserEntry}
                                />
                            </TableFooter>
                        }
                    </Table>
                }
            </CardContent>
            <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    {!currentUserEntry
                        ? "Complete your first run to earn a place in the ranking."
                        : "Best score, perfect clears, average score, then runs break ties."
                    }
                </span>
                <span className="shrink-0">
                    All time
                </span>
            </CardFooter>
        </Card>
    );
};
