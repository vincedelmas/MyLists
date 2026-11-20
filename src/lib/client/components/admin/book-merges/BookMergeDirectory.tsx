import {useId, useState} from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {extractYear} from "@/lib/utils/formatting/date";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {Separator} from "@/lib/client/components/ui/separator";
import type {AdminBookMergeItem} from "@/lib/types/admin.types";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import type {AdminBookMergeSearch} from "@/lib/schemas/admin.schema";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {useAdminMergeBooksMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {adminBookMergePreviewOptions, type AdminBooksForMergeData} from "@/lib/client/react-query/query-options/admin.options";
import {AlertTriangle, BookOpen, ExternalLink, GitMerge, Pencil, RefreshCw, SearchX, Target, Users, X} from "lucide-react";


interface BookMergeDirectoryProps {
    isRefreshing: boolean;
    isRefreshError: boolean;
    data: AdminBooksForMergeData;
    filters: AdminBookMergeSearch;
    onRefresh: () => Promise<unknown>;
}


export function BookMergeDirectory({ data, filters, isRefreshing, isRefreshError, onRefresh }: BookMergeDirectoryProps) {
    const fieldId = useId();
    const confirm = useConfirm();
    const [sourceBooks, setSourceBooks] = useState<AdminBookMergeItem[]>([]);
    const [targetBook, setTargetBook] = useState<AdminBookMergeItem | null>(null);
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate(filters, { resetScroll: false });

    const sourceBookIds = sourceBooks.map(book => book.id);
    const canPreview = targetBook !== null && sourceBookIds.length > 0;

    const previewQuery = useQuery({
        ...adminBookMergePreviewOptions(targetBook?.id ?? 0, sourceBookIds),
        enabled: canPreview,
    });

    const mergeMutation = useAdminMergeBooksMutation(() => {
        setSourceBooks([]);
        if (targetBook) {
            const addedUsers = previewQuery.data?.movedListEntries ?? 0;
            setTargetBook(prev => prev ? { ...prev, usersCount: prev.usersCount + addedUsers } : null);
        }
    });

    const handleSelectTarget = (book: AdminBookMergeItem) => {
        if (targetBook?.id === book.id) {
            setTargetBook(null);
            return;
        }
        setSourceBooks(prev => prev.filter(item => item.id !== book.id));
        setTargetBook(book);
    };

    const handleToggleSource = (book: AdminBookMergeItem) => {
        if (targetBook?.id === book.id) {
            setTargetBook(null);
        }
        setSourceBooks(prev => prev.some(item => item.id === book.id)
            ? prev.filter(item => item.id !== book.id)
            : [...prev, book]);
    };

    const handlePromoteToTarget = (book: AdminBookMergeItem) => {
        setSourceBooks(prev => {
            const withoutBook = prev.filter(item => item.id !== book.id);
            return targetBook ? [...withoutBook, targetBook] : withoutBook;
        });
        setTargetBook(book);
    };

    const handleMerge = async () => {
        if (!targetBook || sourceBooks.length === 0) return;

        const overlapCount = previewQuery.data?.overlappingUsers.length ?? 0;
        const overlapNote = overlapCount > 0
            ? ` ${overlapCount} ${overlapCount === 1 ? "user has" : "users have"} overlapping entries; their richest / most recently updated entry will be kept.`
            : "";

        const approved = await confirm({
            variant: "destructive",
            title: `Merge into "${targetBook.name}"?`,
            confirmLabel: `Merge ${sourceBooks.length} ${sourceBooks.length === 1 ? "book" : "books"}`,
            description: `${sourceBooks.length} duplicate ${sourceBooks.length === 1 ? "book" : "books"} 
            will be deleted and all user entries, tags, activity, and collections will move to #${targetBook.id}. 
            Users keep their personal edition details.${overlapNote}`,
        });

        if (!approved) return;

        mergeMutation.mutate({ data: { sourceBookIds, targetBookId: targetBook.id } });
    };

    return (
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-5" aria-label="Book merge directory">
            <div className="flex flex-wrap items-end gap-3">
                <Field className="flex-1 min-w-60">
                    <FieldLabel htmlFor={`${fieldId}-search`}>
                        Search catalog books
                    </FieldLabel>
                    <SearchInput
                        value={localSearch}
                        id={`${fieldId}-search`}
                        onChange={handleInputChange}
                        placeholder="Search by title, author, publisher, or #id…"
                    />
                </Field>
                <LoadingButton
                    variant="outline"
                    isLoading={isRefreshing}
                    icon={<RefreshCw data-icon="inline-start"/>}
                    onClick={() => {
                        void onRefresh();
                    }}
                >
                    Refresh list
                </LoadingButton>
            </div>

            {isRefreshError &&
                <InlineErrorContainer>
                    Books could not be refreshed. Showing the last loaded results.
                </InlineErrorContainer>
            }

            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="flex min-w-0 flex-col gap-4">
                    {data.items.length > 0 ?
                        <ul className="divide-y rounded-lg border bg-card" aria-label="Catalog books">
                            {data.items.map(book => {
                                const isTarget = targetBook?.id === book.id;
                                const isSource = sourceBookIds.includes(book.id);

                                return (
                                    <li
                                        key={book.id}
                                        className={`flex items-start gap-3 p-3 transition-colors ${
                                            isTarget ? "bg-primary/5" : isSource ? "bg-destructive/5" : ""
                                        }`}
                                    >
                                        <img
                                            alt={book.name}
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
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {book.authors}
                                                        </p>
                                                    }
                                                </div>
                                                <Badge variant="secondary" className="shrink-0 gap-1 text-[11px]">
                                                    <Users className="size-3"/>
                                                    {book.usersCount}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                <span>#{book.id}</span>
                                                <span>·</span>
                                                <span>{book.pages} p.</span>
                                                {book.language &&
                                                    <>
                                                        <span>·</span>
                                                        <span>{formatLocaleName(book.language, "language")}</span>
                                                    </>
                                                }
                                                {book.releaseDate &&
                                                    <>
                                                        <span>·</span>
                                                        <span>{extractYear(book.releaseDate)}</span>
                                                    </>
                                                }
                                                {book.publishers &&
                                                    <>
                                                        <span>·</span>
                                                        <span className="truncate max-w-44">{book.publishers}</span>
                                                    </>
                                                }
                                            </div>

                                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    type="button"
                                                    className="h-7 px-2.5 text-xs"
                                                    variant={isTarget ? "default" : "outline"}
                                                    onClick={() => handleSelectTarget(book)}
                                                >
                                                    <Target className="size-3.5"/>
                                                    {isTarget ? "Target Work" : "Set as Work"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    type="button"
                                                    className="h-7 px-2.5 text-xs"
                                                    onClick={() => handleToggleSource(book)}
                                                    variant={isSource ? "destructive" : "outline"}
                                                >
                                                    <GitMerge className="size-3.5"/>
                                                    {isSource ? "Selected to merge" : "Select duplicate"}
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        :
                        <div className="flex flex-col items-center gap-4 rounded-lg border py-12">
                            <EmptyState
                                icon={filters.search ? SearchX : BookOpen}
                                message={filters.search
                                    ? "No books match your search. Try another title, author, publisher, or ID."
                                    : "No books found in the catalog."}
                            />
                            {data.total > 0 && data.page > 1 &&
                                <Button variant="outline" onClick={() => updateFilters({ page: data.page - 1 })}>
                                    Previous page
                                </Button>
                            }
                        </div>
                    }

                    <Pagination
                        currentPage={data.page}
                        totalPages={Math.max(data.page, data.pages)}
                        onChangePage={page => updateFilters({ page })}
                    />
                </div>

                <Card className="min-w-0 lg:sticky lg:top-16" role="region" aria-label="Merge staging">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitMerge className="size-4"/>
                            Merge Plan
                        </CardTitle>
                        <CardDescription>
                            Choose one Work to keep and one or more duplicate books to merge into it.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Work To Keep
                                {targetBook &&
                                    <Button size="xs" type="button" variant="ghost" onClick={() => setTargetBook(null)}>
                                        Clear
                                    </Button>
                                }
                            </div>
                            {targetBook ? (
                                <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                                    <img
                                        alt={targetBook.name}
                                        src={targetBook.imageCover}
                                        className="h-16 w-11 shrink-0 rounded border object-cover"
                                    />
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-snug wrap-anywhere">
                                            {targetBook.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            #{targetBook.id} · {targetBook.pages} p.
                                            {targetBook.releaseDate && ` · ${extractYear(targetBook.releaseDate)}`}
                                            {" · "}{targetBook.usersCount} {targetBook.usersCount === 1 ? "user" : "users"}
                                        </p>
                                        <Link
                                            target="_blank"
                                            rel="noreferrer"
                                            to="/details/edit/$mediaType/$mediaId"
                                            params={{ mediaType: MediaType.BOOKS, mediaId: targetBook.id }}
                                            className={buttonVariants({ variant: "outline", size: "xs", className: "mt-1" })}
                                        >
                                            <Pencil className="size-3"/>
                                            Edit Work metadata
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                                    Pick a target book from the catalog.
                                </div>
                            )}
                        </div>

                        <Separator/>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span>
                                    Duplicates to merge ({sourceBooks.length})
                                </span>
                                {sourceBooks.length > 0 &&
                                    <Button size="xs" type="button" variant="ghost" onClick={() => setSourceBooks([])}>
                                        Clear all
                                    </Button>
                                }
                            </div>
                            {sourceBooks.length > 0 ?
                                <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto scrollbar-thin">
                                    {sourceBooks.map(book =>
                                        <li key={book.id} className="flex items-center gap-2.5 rounded-lg border bg-muted/30 p-2">
                                            <img
                                                alt={book.name}
                                                src={book.imageCover}
                                                className="h-12 w-8 shrink-0 rounded border object-cover"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium">
                                                    {book.name}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    #{book.id} · {book.pages} p.
                                                    {book.releaseDate && ` · ${extractYear(book.releaseDate)}`}
                                                    {" · "}{book.usersCount} {book.usersCount === 1 ? "user" : "users"}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                title="Set as Work"
                                                onClick={() => handlePromoteToTarget(book)}
                                            >
                                                <Target className="size-3.5"/>
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                title="Remove from merge"
                                                onClick={() => handleToggleSource(book)}
                                            >
                                                <X className="size-3.5"/>
                                            </Button>
                                        </li>
                                    )}
                                </ul>
                                :
                                <div className="rounded-lg border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                                    Select one or more duplicate books to merge into the Work.
                                </div>
                            }
                        </div>

                        {canPreview &&
                            <>
                                <Separator/>
                                <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
                                    <p className="font-medium">
                                        Merge impact
                                    </p>
                                    {previewQuery.isPending ?
                                        <p className="text-muted-foreground">
                                            Calculating impact...
                                        </p>
                                        : previewQuery.isError ?
                                            <p className="text-destructive">
                                                Could not load merge preview.
                                            </p>
                                            :
                                            <>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="rounded bg-background p-2 border">
                                                        <div className="text-base font-semibold">
                                                            {previewQuery.data.movedListEntries}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            User entries
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-background p-2 border">
                                                        <div className="text-base font-semibold">
                                                            {previewQuery.data.movedCollectionItems}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Collections
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-background p-2 border">
                                                        <div className="text-base font-semibold">
                                                            {previewQuery.data.movedActivities + previewQuery.data.mergedActivities}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Monthly activity
                                                        </div>
                                                        {(previewQuery.data.movedActivities > 0 || previewQuery.data.mergedActivities > 0) &&
                                                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                                {previewQuery.data.mergedActivities > 0
                                                                    ? `${previewQuery.data.movedActivities} re-pointed · ${previewQuery.data.mergedActivities} combined`
                                                                    : "re-pointed only"}
                                                            </div>
                                                        }
                                                    </div>
                                                </div>
                                                {previewQuery.data.overlappingUsers.length > 0 &&
                                                    <div className="mt-1 flex items-start gap-2 rounded-md border border-warning/40
                                                    bg-warning/10 p-2.5 text-warning-foreground">
                                                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning"/>
                                                        <div className="space-y-1">
                                                            <p className="font-medium">
                                                                {previewQuery.data.overlappingUsers.length} overlapping{" "}
                                                                {previewQuery.data.overlappingUsers.length === 1 ? "user" : "users"}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Already in multiple selected books{" "}
                                                                ({previewQuery.data.overlappingUsers.map(u => u.name).join(", ")}).
                                                                Their entry with the most data (or latest update) will be kept and duplicates removed.
                                                            </p>
                                                        </div>
                                                    </div>
                                                }
                                                <p className="text-[11px] text-muted-foreground">
                                                    Moved users keep their own edition title, cover, pages, publisher, date, and language.
                                                </p>
                                            </>
                                    }
                                </div>
                            </>
                        }

                        <LoadingButton
                            className="w-full"
                            variant="destructive"
                            onClick={handleMerge}
                            isLoading={mergeMutation.isPending}
                            icon={<GitMerge data-icon="inline-start"/>}
                            disabled={!canPreview || previewQuery.isPending || previewQuery.isError}
                        >
                            {canPreview
                                ? `Merge ${sourceBooks.length} ${sourceBooks.length === 1 ? "book" : "books"} into #${targetBook.id}`
                                : "Select target & duplicates"}
                        </LoadingButton>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
