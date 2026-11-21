import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import type {AdminBookMergeItem} from "@/lib/types/admin.types";
import {ExternalLink, GitMerge, Target, Users} from "lucide-react";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";


interface BookMergeListProps {
    label: string;
    disabled: boolean;
    targetBookId?: number;
    sourceBookIds: number[];
    suggestedBookId?: number;
    books: AdminBookMergeItem[];
    onSelectTarget: (book: AdminBookMergeItem) => void;
    onToggleSource: (book: AdminBookMergeItem) => void;
}


export function BookMergeList(props: BookMergeListProps) {
    const { label, disabled, books, sourceBookIds, targetBookId, suggestedBookId, onSelectTarget, onToggleSource } = props;

    return (
        <ul className="divide-y" aria-label={label}>
            {books.map(book => {
                const isTarget = targetBookId === book.id;
                const isSource = sourceBookIds.includes(book.id);

                return (
                    <li
                        key={book.id}
                        className={cn("flex items-start gap-3 p-3 transition-colors", {
                            "bg-primary/5": isTarget,
                            "bg-destructive/5": isSource,
                        })}
                    >
                        <img
                            alt=""
                            loading="lazy"
                            src={book.imageCover}
                            className="h-18 w-12 shrink-0 rounded border object-cover"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium leading-snug wrap-anywhere">
                                            {book.name}
                                        </span>
                                        <Link
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`Open ${book.name}`}
                                            to="/details/$mediaType/$mediaId"
                                            params={{ mediaType: MediaType.BOOKS, mediaId: book.id }}
                                            className="shrink-0 text-muted-foreground hover:text-foreground"
                                        >
                                            <ExternalLink className="size-3.5"/>
                                        </Link>
                                    </div>
                                    {book.authors &&
                                        <p className="text-xs text-muted-foreground wrap-anywhere">
                                            {book.authors}
                                        </p>
                                    }
                                </div>
                                <Badge variant="secondary" className="shrink-0 gap-1 text-[11px]">
                                    <Users className="size-3"/>
                                    {formatNumber(book.usersCount)}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                <span>#{book.id}</span>
                                <span>·</span>
                                <span>{formatNumber(book.pages)} p.</span>
                                {book.language &&
                                    <>
                                        <span>·</span>
                                        <span>{formatLocaleName(book.language, "language")}</span>
                                    </>
                                }
                                {book.releaseDate &&
                                    <>
                                        <span>·</span>
                                        <MediaReleaseDate date={book.releaseDate} precision="year"/>
                                    </>
                                }
                                {book.publishers &&
                                    <>
                                        <span>·</span>
                                        <span className="wrap-anywhere">{book.publishers}</span>
                                    </>
                                }
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <Button
                                    size="xs"
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={isTarget}
                                    onClick={() => onSelectTarget(book)}
                                    variant={isTarget ? "default" : "outline"}
                                >
                                    <Target data-icon="inline-start"/>
                                    {isTarget ? "Target Work" : "Set as Work"}
                                </Button>
                                <Button
                                    size="xs"
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={isSource}
                                    onClick={() => onToggleSource(book)}
                                    variant={isSource ? "destructive" : "outline"}
                                >
                                    <GitMerge data-icon="inline-start"/>
                                    {isSource ? "Selected to merge" : "Select duplicate"}
                                </Button>
                                {suggestedBookId === book.id &&
                                    <Badge variant="outline">
                                        Suggested Work
                                    </Badge>
                                }
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
