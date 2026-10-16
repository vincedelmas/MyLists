import {Trophy} from "lucide-react";
import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface LeaderboardEntry {
    rank: number;
    name: string;
    userId: number;
    image: string | null;
}


interface LeaderboardProps<TEntry extends LeaderboardEntry> {
    footer: string;
    entries: TEntry[];
    columns: ReactNode;
    description: string;
    currentUserId?: number;
    currentUserEntry: TEntry | null;
    renderCells: (entry: TEntry) => ReactNode;
}


export const Leaderboard = <TEntry extends LeaderboardEntry>(props: LeaderboardProps<TEntry>) => {
    const { entries, currentUserEntry, currentUserId, description, footer, columns, renderCells } = props;

    return (
        <Card className="mt-8">
            <CardHeader className="border-b">
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>
                    {description}
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
                                {columns}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) =>
                                <LeaderboardRow key={entry.userId} entry={entry} isCurrentUser={entry.userId === currentUserId}>
                                    {renderCells(entry)}
                                </LeaderboardRow>
                            )}
                        </TableBody>
                        {currentUserEntry && currentUserEntry.rank > 10 &&
                            <TableFooter className="border-t-2 border-primary/20 bg-primary/5">
                                <LeaderboardRow entry={currentUserEntry} isPinned={true} isCurrentUser={true}>
                                    {renderCells(currentUserEntry)}
                                </LeaderboardRow>
                            </TableFooter>
                        }
                    </Table>
                }
            </CardContent>
            <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
                <span>{footer}</span>
                <span className="shrink-0">
                    All time
                </span>
            </CardFooter>
        </Card>
    );
};


interface LeaderboardRowProps {
    isPinned?: boolean;
    children: ReactNode;
    isCurrentUser: boolean;
    entry: LeaderboardEntry;
}


const LeaderboardRow = ({ entry, children, isCurrentUser, isPinned = false }: LeaderboardRowProps) => {
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
                    "mx-auto flex size-7 items-center justify-center rounded-full text-sm font-semibold text-muted-foreground",
                    entry.rank === 1 && "bg-gold/15 text-gold",
                    entry.rank === 2 && "bg-silver/15 text-silver",
                    entry.rank === 3 && "bg-bronze/15 text-bronze",
                )}>
                    {entry.rank <= 3 ?
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
                            <Link
                                to="/profile/$username"
                                params={{ username: entry.name }}
                                className="min-w-0 truncate hover:text-brand"
                            >
                                {entry.name}
                            </Link>

                            {isCurrentUser &&
                                <Badge className="shrink-0">
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
            {children}
        </TableRow>
    );
};
