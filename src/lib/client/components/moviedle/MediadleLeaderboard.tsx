import {Trophy} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {mediadleLeaderboardOptions} from "@/lib/client/react-query/query-options";
import {Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


type LeaderboardData = Awaited<ReturnType<typeof mediadleLeaderboardOptions.queryFn & {}>>;
type LeaderboardEntry = LeaderboardData["entries"][number];


interface MediadleLeaderboardProps {
    currentUserId?: number;
    leaderboard: LeaderboardData;
}


interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
    isPinned?: boolean;
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
                <div className="flex min-w-36 items-center gap-2.5">
                    <ProfileIcon
                        fallbackSize="text-xs"
                        className="size-8 border shadow-none"
                        user={{ image: entry.image, name: entry.name }}
                    />
                    <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                            <Link to="/profile/$username" params={{ username: entry.name }}>
                                {entry.name}
                            </Link>
                            {isCurrentUser &&
                                <Badge variant="secondary">
                                    You
                                </Badge>
                            }
                        </div>
                        {isPinned &&
                            <p className="text-xs text-muted-foreground">
                                {placesFromTopTen} {placesFromTopTen === 1 ? "place" : "places"} from the top 10
                            </p>
                        }
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
                {entry.totalWon}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground tabular-nums max-sm:hidden">
                {formatPercent(entry.winRate, { fractionDigits: 0 })}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
                {entry.currentStreak}
            </TableCell>
            <TableCell className="pr-4 text-right font-mono text-muted-foreground tabular-nums max-md:hidden">
                {formatNumber(entry.averageAttempts, { fractionDigits: 1, locale: "en" })}
            </TableCell>
        </TableRow>
    );
};


export const MediadleLeaderboard = ({ leaderboard, currentUserId }: MediadleLeaderboardProps) => {
    const { entries, currentUserEntry } = leaderboard;

    return (
        <Card className="mt-8">
            <CardHeader className="border-b">
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>
                    The sharpest eyes in Mediadle, ranked all time.
                </CardDescription>
                <CardAction>
                    <Badge variant="outline">
                        <Trophy data-icon="inline-start"/>
                        Top 10
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="px-0">
                {entries.length === 0 ?
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
                                    entry={currentUserEntry}
                                    isCurrentUser={true}
                                />
                            </TableFooter>
                        }
                    </Table>
                }
            </CardContent>
            <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    {currentUserId && !currentUserEntry
                        ? "Complete your first Mediadle to earn a place in the ranking."
                        : "Best streak and fewer attempts break ties."
                    }
                </span>
                <span className="shrink-0">
                    All time
                </span>
            </CardFooter>
        </Card>
    );
};
