import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {useId, useRef, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Separator} from "@/lib/client/components/ui/separator";
import {formatNumber} from "@/lib/utils/formatting/number";
import type {AdminBookMergeItem} from "@/lib/types/admin.types";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import type {AdminBookMergeSearch} from "@/lib/schemas/admin.schema";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {BookMergeList} from "@/lib/client/components/admin/book-merges/BookMergeList";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {useAdminMergeBooksMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {adminBookMergePreviewOptions, type AdminBooksForMergeData} from "@/lib/client/react-query/query-options/admin.options";
import {AlertTriangle, ArrowLeft, BookOpen, ChevronRight, GitMerge, Pencil, RefreshCw, SearchX, Target, X} from "lucide-react";


const searchFields = {
    duplicates: { label: "Filter duplicate groups", placeholder: "Title or author…" },
    authors: { label: "Search authors", placeholder: "Author name…" },
    catalog: { label: "Search catalog books", placeholder: "Title, author, publisher, or #id…" },
};


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
    const mergePlanRef = useRef<HTMLDivElement>(null);
    const [sourceBooks, setSourceBooks] = useState<AdminBookMergeItem[]>([]);
    const [targetBook, setTargetBook] = useState<AdminBookMergeItem | null>(null);
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate(filters, { resetScroll: false });

    const sourceBookIds = sourceBooks.map(book => book.id);
    const isPastLastPage = data.total > 0 && data.page > data.pages;

    const hasMergePlan = targetBook !== null || sourceBooks.length > 0;
    const canPreview = targetBook !== null && sourceBookIds.length > 0;

    const previewQuery = useQuery({
        ...adminBookMergePreviewOptions(targetBook?.id ?? 0, sourceBookIds),
        enabled: canPreview,
    });

    const mergeMutation = useAdminMergeBooksMutation(({ targetBookId, movedListEntries }) => {
        setSourceBooks([]);
        setTargetBook(prev => prev?.id === targetBookId
            ? { ...prev, usersCount: prev.usersCount + movedListEntries }
            : prev);
    });

    const handleSelectTarget = (book: AdminBookMergeItem) => {
        if (targetBook?.id === book.id) {
            setTargetBook(null);
            return;
        }
        if (sourceBookIds.includes(book.id)) {
            setSourceBooks(prev => {
                const remaining = prev.filter(item => item.id !== book.id);
                return targetBook ? [...remaining, targetBook] : remaining;
            });
        }
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

    const listProps = {
        sourceBookIds,
        targetBookId: targetBook?.id,
        disabled: mergeMutation.isPending,
        onSelectTarget: handleSelectTarget,
        onToggleSource: handleToggleSource,
    };

    const emptyMessages = {
        duplicates: filters.search ? "No duplicate groups match your search." : "No likely duplicates found.",
        authors: filters.search ? "No authors with multiple books match your search." : "No authors with multiple books found.",
        "author-books": "No catalog books found for this author.",
        catalog: filters.search
            ? "No books match your search. Try another title, author, publisher, or ID."
            : "No books found in the catalog.",
    };

    return (
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-5" aria-label="Book merge directory">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <ToggleGroup
                    size="sm"
                    variant="outline"
                    className="flex-wrap"
                    aria-label="Browse books"
                    value={[filters.view]}
                    onValueChange={values => {
                        const [view] = values as AdminBookMergeSearch["view"][];
                        if (view) void updateFilters({ view, author: undefined, search: undefined, page: 1 });
                    }}
                >
                    <ToggleGroupItem value="duplicates">
                        Likely duplicates
                    </ToggleGroupItem>
                    <ToggleGroupItem value="authors">
                        By author
                    </ToggleGroupItem>
                    <ToggleGroupItem value="catalog">
                        All books
                    </ToggleGroupItem>
                </ToggleGroup>
                <LoadingButton
                    size="sm"
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
                    {data.kind === "author-books" ?
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => updateFilters({ author: undefined, page: 1 })}>
                                <ArrowLeft data-icon="inline-start"/>
                                Back to authors
                            </Button>
                            <h2 className="min-w-0 text-lg font-semibold wrap-anywhere">
                                {data.author}
                            </h2>
                        </div>
                        :
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-search`}>
                                {searchFields[data.kind].label}
                            </FieldLabel>
                            <SearchInput
                                value={localSearch}
                                id={`${fieldId}-search`}
                                onChange={handleInputChange}
                                placeholder={searchFields[data.kind].placeholder}
                            />
                        </Field>
                    }

                    {data.items.length === 0 ?
                        <div className="flex flex-col items-center gap-4 rounded-lg border py-12">
                            <EmptyState
                                icon={filters.search ? SearchX : BookOpen}
                                message={isPastLastPage ? "This page is empty." : emptyMessages[data.kind]}
                            />
                            {isPastLastPage &&
                                <Button variant="outline" onClick={() => updateFilters({ page: data.pages })}>
                                    Go to last page
                                </Button>
                            }
                        </div>
                        : data.kind === "duplicates" ?
                            data.items.map(group => {
                                const [suggested, ...duplicates] = group.books;

                                const isStaged = group.books.some(book => book.id === targetBook?.id)
                                    && sourceBooks.length === duplicates.length
                                    && sourceBooks.every(book => group.books.some(item => item.id === book.id));

                                return (
                                    <section key={group.key} className="min-w-0 rounded-lg border bg-card">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                                            <div className="min-w-0">
                                                <h2 className="text-sm font-semibold wrap-anywhere">
                                                    {suggested.name}
                                                </h2>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatNumber(group.books.length)} books with the same title and authors
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isStaged || mergeMutation.isPending}
                                                onClick={() => {
                                                    setTargetBook(suggested);
                                                    setSourceBooks(duplicates);
                                                    mergePlanRef.current?.focus();
                                                }}
                                            >
                                                <GitMerge data-icon="inline-start"/>
                                                {isStaged ? "Group staged" : hasMergePlan ? "Replace merge plan" : "Stage group"}
                                            </Button>
                                        </div>
                                        <BookMergeList
                                            {...listProps}
                                            books={group.books}
                                            label={suggested.name}
                                            suggestedBookId={suggested.id}
                                        />
                                    </section>
                                );
                            })
                            : data.kind === "authors" ?
                                <ul className="divide-y rounded-lg border bg-card" aria-label="Authors">
                                    {data.items.map(author =>
                                        <li key={author.key}>
                                            <Button
                                                variant="ghost"
                                                onClick={() => updateFilters({ author: author.key, page: 1 })}
                                                className="h-auto w-full justify-start gap-3 whitespace-normal px-3 py-2.5 text-left"
                                            >
                                                <span className="min-w-0 flex-1 wrap-anywhere">
                                                    {author.name}
                                                </span>
                                                <Badge variant="secondary">
                                                    {formatNumber(author.bookCount)} books
                                                </Badge>
                                                <ChevronRight data-icon="inline-end"/>
                                            </Button>
                                        </li>
                                    )}
                                </ul>
                                :
                                <div className="rounded-lg border bg-card">
                                    <BookMergeList
                                        {...listProps}
                                        books={data.items}
                                        label={data.kind === "author-books" ? `Books by ${data.author}` : "Catalog books"}
                                    />
                                </div>
                    }

                    <Pagination
                        totalPages={data.pages}
                        currentPage={data.page}
                        onChangePage={page => updateFilters({ page })}
                    />
                </div>

                <Card
                    role="region"
                    tabIndex={-1}
                    ref={mergePlanRef}
                    aria-label="Merge staging"
                    className="min-w-0 scroll-mt-16 lg:sticky lg:top-16"
                >
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
                                    <Button
                                        size="xs"
                                        type="button"
                                        variant="ghost"
                                        disabled={mergeMutation.isPending}
                                        onClick={() => setTargetBook(null)}
                                    >
                                        Clear
                                    </Button>
                                }
                            </div>
                            {targetBook ?
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
                                            #{targetBook.id} · {formatNumber(targetBook.pages)} p.
                                            {targetBook.releaseDate && <>{" · "}<MediaReleaseDate date={targetBook.releaseDate} precision="year"/></>}
                                            {" · "}{formatNumber(targetBook.usersCount)} {targetBook.usersCount === 1 ? "user" : "users"}
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
                                :
                                <div className="rounded-lg border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                                    Pick a target book from the catalog.
                                </div>
                            }
                        </div>

                        <Separator/>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span>
                                    Duplicates to merge ({sourceBooks.length})
                                </span>
                                {sourceBooks.length > 0 &&
                                    <Button
                                        size="xs"
                                        type="button"
                                        variant="ghost"
                                        disabled={mergeMutation.isPending}
                                        onClick={() => setSourceBooks([])}
                                    >
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
                                                    #{book.id} · {formatNumber(book.pages)} p.
                                                    {book.releaseDate && <>{" · "}<MediaReleaseDate date={book.releaseDate} precision="year"/></>}
                                                    {" · "}{formatNumber(book.usersCount)} {book.usersCount === 1 ? "user" : "users"}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                title="Set as Work"
                                                disabled={mergeMutation.isPending}
                                                onClick={() => handleSelectTarget(book)}
                                            >
                                                <Target className="size-3.5"/>
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                title="Remove from merge"
                                                disabled={mergeMutation.isPending}
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
                                    {previewQuery.isPending || previewQuery.isFetching ?
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
                            disabled={!canPreview || previewQuery.isPending || previewQuery.isFetching || previewQuery.isError}
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
