import {useRef, useState} from "react";
import {Link, useNavigate} from "@tanstack/react-router";
import {useIsMutating, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowUp, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Eye, GitMerge, Library, Users, X} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {BOOK_WORK_SELECTION_LIMIT, type BookGroupMergeInput} from "@/lib/schemas/book-editions.schema";
import {Button} from "@/lib/client/components/ui/button";
import {Input} from "@/lib/client/components/ui/input";
import {Badge} from "@/lib/client/components/ui/badge";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {Field, FieldContent, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {BookMergeConflicts, type BookReaderChoices} from "./BookMergeConflicts";
import {BookWorkInspector} from "./BookWorkInspector";
import {BookReviewQueue} from "./BookReviewQueue";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {getBookCatalogue, getBookGroupPreview, postKeepBookGroupSeparate, postMergeBookWorkGroup} from "@/lib/server/functions/book-editions";

type GroupPreview = Awaited<ReturnType<typeof getBookGroupPreview>>;
const sortNames = {readers: "Most readers", title: "Title A–Z", oldest: "Oldest publication"};

export function BookWorkManager({initialWorkId}: {initialWorkId?: number}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const grouping = useIsMutating({mutationKey: ["bookGrouping"]}) > 0;
    const comparisonRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState("");
    const [view, setView] = useState("catalogue");
    const query = useDebounce(search.trim(), 250);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<keyof typeof sortNames>("readers");
    const [selected, setSelected] = useState<number[]>(initialWorkId ? [initialWorkId] : []);
    const [preferredTarget, setPreferredTarget] = useState<number | null>(null);
    const [inspectedId, setInspectedId] = useState<number | null>(null);
    const catalogue = useQuery({queryKey: ["bookCatalogue", query, page, sort], queryFn: () => getBookCatalogue({data: {query, page, sort}})});
    const preview = useQuery({queryKey: ["bookGroupPreview", selected], queryFn: () => getBookGroupPreview({data: {workIds: selected}}),
        enabled: selected.length > 0, refetchOnWindowFocus: false});
    const targetId = preferredTarget ?? preview.data?.recommendedTargetId;
    const chooseWorks = (ids: number[]) => {
        setSelected(ids);
        if (preferredTarget !== null && !ids.includes(preferredTarget)) setPreferredTarget(null);
    };
    const addWork = (id: number) => chooseWorks([...new Set([...selected, id])]);
    const afterChange = async (mediaId: number) => {
        chooseWorks([mediaId]); setInspectedId(null); setPreferredTarget(null); setPage(1);
        await navigate({to: "/books/manage", search: {workId: mediaId}, replace: true});
        await queryClient.invalidateQueries();
    };
    const clearSelection = () => {
        chooseWorks([]);
        setPreferredTarget(null);
        void navigate({to: "/books/manage", search: {}, replace: true});
    };
    const afterMerge = async () => {
        clearSelection(); setInspectedId(null);
        await queryClient.invalidateQueries();
    };
    const pageIds = catalogue.data?.items.map(work => work.id) ?? [];
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.includes(id));
    const selectionOnPage = pageIds.filter(id => selected.includes(id)).length;

    return <div className="flex min-w-0 flex-col gap-5 py-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2"><div className="flex items-center gap-3"><Library className="size-6 text-primary"/>
                <h1 className="text-3xl font-semibold tracking-tight">Books & editions</h1></div>
                <p className="text-sm text-muted-foreground">Select works that belong to the same book, compare them, and keep one shared page.</p>
            </div><div className="flex items-center gap-3"><ToggleGroup aria-label="Find works" value={[view]} variant="outline" size="sm" spacing={0} onValueChange={values => {if (values[0]) setView(values[0]);}}>
                <ToggleGroupItem value="catalogue">Catalogue</ToggleGroupItem><ToggleGroupItem value="review">Review queue</ToggleGroupItem>
            </ToggleGroup><Badge variant="outline">{selected.length} selected</Badge></div>
        </header>
        <div className="sticky top-16 z-10 flex items-center justify-between gap-3 rounded-lg border bg-background p-3 lg:hidden">
            <span className="text-sm">{selected.length} works in your selection</span>
            <Button size="sm" variant="secondary" disabled={!selected.length} onClick={() => comparisonRef.current?.scrollIntoView({behavior: "smooth", block: "start"})}>Review selection <ArrowUp data-icon="inline-end"/></Button>
        </div>
        <div className="grid min-w-0 gap-5 lg:h-[calc(100dvh-13rem)] lg:min-h-[32rem] lg:grid-cols-2">
            {view === "review" ? <BookReviewQueue selectedIds={selected} busy={grouping} onReview={ids => {chooseWorks(ids); setPreferredTarget(null);}}/> : <Card className="min-h-0 min-w-0">
                <CardHeader><CardTitle>Catalogue</CardTitle><CardDescription>Search titles, authors, Google Books IDs or ISBNs.</CardDescription>
                    <FieldGroup className="mt-3 flex-row items-end gap-2"><Field className="min-w-0"><FieldLabel htmlFor="book-catalogue-search" className="sr-only">Search catalogue</FieldLabel>
                        <Input id="book-catalogue-search" value={search} onChange={event => {setSearch(event.target.value); setPage(1);}} placeholder="Try Harry Potter, Tolkien, or an ISBN…"/>
                    </Field><Field className="w-40 shrink-0"><FieldLabel htmlFor="book-catalogue-sort" className="sr-only">Sort by</FieldLabel>
                        <Select value={sort} onValueChange={value => {if (value) {setSort(value); setPage(1);}}}>
                            <SelectTrigger id="book-catalogue-sort" className="w-full"><SelectValue>{sortNames[sort]}</SelectValue></SelectTrigger>
                            <SelectContent><SelectGroup>{Object.entries(sortNames).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
                        </Select>
                    </Field></FieldGroup>
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <Field orientation="horizontal" className="w-auto"><Checkbox id="book-select-page" checked={allPageSelected} indeterminate={selectionOnPage > 0 && !allPageSelected}
                            disabled={grouping || !pageIds.length || (!allPageSelected && new Set([...selected, ...pageIds]).size > BOOK_WORK_SELECTION_LIMIT)}
                            onCheckedChange={checked => chooseWorks(checked ? [...new Set([...selected, ...pageIds])] : selected.filter(id => !pageIds.includes(id)))}/>
                            <FieldLabel htmlFor="book-select-page">Select this page</FieldLabel>
                        </Field><span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{catalogue.data?.total ?? "…"} works</span>
                    </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {catalogue.isPending && <p role="status" className="py-8 text-center text-muted-foreground">Loading catalogue…</p>}
                    {catalogue.isError && <Alert variant="destructive"><AlertTitle>Could not load the catalogue</AlertTitle><AlertDescription>{catalogue.error.message}</AlertDescription></Alert>}
                    <FieldSet className="gap-2"><FieldLegend className="sr-only">Works in the catalogue</FieldLegend>
                        {catalogue.data?.items.map(work => <Field key={work.id} orientation="horizontal" className={cn("rounded-lg border p-2.5 transition-colors", selected.includes(work.id) && "border-primary/40 bg-primary/5")}>
                            <Checkbox id={`select-work-${work.id}`} checked={selected.includes(work.id)}
                                disabled={grouping || (!selected.includes(work.id) && selected.length >= BOOK_WORK_SELECTION_LIMIT)}
                                onCheckedChange={checked => checked ? addWork(work.id) : chooseWorks(selected.filter(id => id !== work.id))}/>
                            <FieldLabel htmlFor={`select-work-${work.id}`} className="min-w-0 flex-1 cursor-pointer items-center gap-3">
                                <img src={work.imageCover} alt="" className="aspect-2/3 w-8 shrink-0 rounded-sm object-cover"/>
                                <FieldContent className="min-w-0"><span className="line-clamp-2 leading-snug">{work.name}</span>
                                    <span className="truncate text-xs font-normal text-muted-foreground">{work.authors || "Author unknown"}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{work.releaseDate?.slice(0, 4) ?? "Undated"} · {work.editions} edition{work.editions === 1 ? "" : "s"} · {work.readers} reader{work.readers === 1 ? "" : "s"}</span>
                                </FieldContent>
                            </FieldLabel>
                            <Button variant="ghost" size="icon-sm" disabled={grouping} aria-label={`Inspect ${work.name}`} onClick={() => setInspectedId(work.id)}><Eye/></Button>
                        </Field>)}
                    </FieldSet>
                    {catalogue.data?.items.length === 0 && <Empty><EmptyHeader><EmptyTitle>No matching works</EmptyTitle><EmptyDescription>Try another title, author or identifier.</EmptyDescription></EmptyHeader></Empty>}
                </CardContent>
                <CardFooter className="justify-between gap-2"><Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft data-icon="inline-start"/> Previous</Button>
                    <span className="text-xs tabular-nums text-muted-foreground">{page} / {Math.max(1, Math.ceil((catalogue.data?.total ?? 0) / 30))}</span>
                    <Button size="sm" variant="ghost" disabled={!catalogue.data?.hasNextPage} onClick={() => setPage(page + 1)}>Next <ChevronRight data-icon="inline-end"/></Button>
                </CardFooter>
            </Card>}
            <div ref={comparisonRef} className="order-first flex min-h-0 min-w-0 scroll-mt-36 flex-col lg:order-last lg:scroll-mt-20" data-testid="book-comparison">
                {preview.data && selected.length > 0 && targetId ? <BookGroupComparison key={preview.data.version} preview={preview.data} targetId={targetId}
                    onTargetChange={setPreferredTarget} onInspect={setInspectedId} onRemove={id => chooseWorks(selected.filter(item => item !== id))}
                    onClear={clearSelection} onSaved={afterMerge} refreshing={preview.isFetching} onReload={() => preview.refetch()}/>
                    : <Card className="min-h-0 flex-1"><CardHeader><CardTitle>Compare your selection</CardTitle><CardDescription>Your selection stays here as you browse and search.</CardDescription></CardHeader>
                        <CardContent className="flex flex-1 items-center">
                            {preview.isError && selected.length > 0 ? <Alert variant="destructive"><AlertTitle>Could not load your selection</AlertTitle><AlertDescription>{preview.error.message} <Button variant="ghost" onClick={clearSelection}>Clear selection</Button></AlertDescription></Alert>
                                : <Empty><EmptyHeader><EmptyMedia variant="icon"><GitMerge/></EmptyMedia><EmptyTitle>{selected.length ? "Loading comparison…" : "One book. All its editions."}</EmptyTitle>
                                    <EmptyDescription>{selected.length ? "Checking works and their readers." : "Select two or more works from the catalogue. The one with the most readers will be suggested as the shared page to keep."}</EmptyDescription></EmptyHeader></Empty>}
                        </CardContent>
                    </Card>}
            </div>
        </div>
        <p className="text-xs text-muted-foreground">Selections stay across searches and pages. Compare up to {BOOK_WORK_SELECTION_LIMIT} works at a time.</p>
        <BookWorkInspector key={inspectedId} mediaId={inspectedId} onClose={() => setInspectedId(null)} selectedWorks={preview.data?.works ?? []}
            selectedIds={selected} onSelect={addWork} onSaved={afterChange}/>
    </div>;
}

function BookGroupComparison({preview, targetId, onTargetChange, onInspect, onRemove, onClear, onSaved, refreshing, onReload}: {
    preview: GroupPreview; targetId: number; onTargetChange: (id: number) => void; onInspect: (id: number) => void;
    onRemove: (id: number) => void; onClear: () => void; onSaved: () => Promise<void>; refreshing: boolean; onReload: () => void;
}) {
    const [choices, setChoices] = useState<BookReaderChoices>({});
    const comparisonBody = useRef<HTMLDivElement>(null);
    const conflictsSection = useRef<HTMLDivElement>(null);
    const target = preview.works.find(work => work.id === targetId)!;
    const merge = useMutation({mutationKey: ["bookGrouping"], mutationFn: postMergeBookWorkGroup, onSuccess: onSaved, meta: {successToastMessage: "Works merged. All editions now share one book page."}});
    const separate = useMutation({mutationKey: ["bookGrouping"], mutationFn: postKeepBookGroupSeparate, onSuccess: onSaved, meta: {successToastMessage: "These works will be kept separate."}});
    const busy = merge.isPending || separate.isPending;
    const ready = preview.works.length > 1 && preview.conflicts.every(row => choices[row.userId]?.keepWorkId && choices[row.userId]?.reading);
    const workNames = new Map(preview.works.map(work => [work.id, `${work.name} · #${work.id}`]));
    const publicationDate = target.releaseDateSource === "edition"
        ? preview.works.flatMap(work => work.editions.flatMap(edition => edition.releaseDate ? [edition.releaseDate] : [])).sort()[0]
        : target.releaseDate;
    return <Card className="min-h-0 flex-1 max-lg:max-h-[75dvh]" aria-label="Compare selected works">
        <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{preview.works.length > 1 ? `Compare ${preview.works.length} works` : "Your selected work"}</CardTitle>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>Clear</Button></div>
            <CardDescription>{preview.editionCount} edition{preview.editionCount === 1 ? "" : "s"} · {preview.readers} reader{preview.readers === 1 ? "" : "s"}
                {preview.conflicts.length > 0 && <> · <Button variant="ghost" size="sm" className="h-auto p-0 text-xs underline underline-offset-4" onClick={() => comparisonBody.current?.scrollTo({top: conflictsSection.current!.offsetTop, behavior: "smooth"})}>
                    {ready ? "Review" : "Resolve"} {preview.conflicts.length} overlap{preview.conflicts.length === 1 ? "" : "s"}
                </Button></>}
            </CardDescription>
        </CardHeader>
        <CardContent ref={comparisonBody} className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain">
            <FieldSet disabled={busy}><FieldLegend>Work to keep</FieldLegend>
                <p className="text-xs text-muted-foreground">The most-read work is preselected. Choose another to keep its title, cover and work information.</p>
                <RadioGroup value={String(targetId)} disabled={busy} onValueChange={value => onTargetChange(Number(value))} aria-label="Work to keep">
                    {preview.works.map(work => <Field key={work.id} orientation="horizontal" className={cn("items-start rounded-lg border p-3", work.id === targetId && "border-primary/50 bg-primary/5")}>
                        <RadioGroupItem id={`keep-work-${work.id}`} value={String(work.id)} className="mt-1"/>
                        <FieldLabel htmlFor={`keep-work-${work.id}`} className="min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <img src={work.imageCover} alt="" className="aspect-2/3 w-9 shrink-0 rounded-sm object-cover"/>
                            <FieldContent className="min-w-0 gap-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-snug">{work.name}
                                {work.id === preview.recommendedTargetId && <Badge variant="secondary"><Users data-icon="inline-start"/> Most readers</Badge>}</span>
                                <span className="text-xs font-normal text-muted-foreground">{work.authors.join(", ") || "Author unknown"} · #{work.id}</span>
                                <span className="text-xs font-normal text-muted-foreground">{work.releaseDate?.slice(0, 4) ?? "Undated"} · {work.readers} reader{work.readers === 1 ? "" : "s"} · {work.editions.length} edition{work.editions.length === 1 ? "" : "s"}
                                    {work.editions.some(edition => edition.language) && <> · {[...new Set(work.editions.flatMap(edition => edition.language ? [formatLocaleName(edition.language, "language")] : []))].join(" / ")}</>}
                                </span>
                            </FieldContent>
                        </FieldLabel>
                        <div className="flex flex-col gap-1"><Button variant="ghost" size="icon-xs" aria-label={`Inspect selected ${work.name}`} onClick={() => onInspect(work.id)}><Eye/></Button>
                            <Button variant="ghost" size="icon-xs" aria-label={`Remove ${work.name} from selection`} onClick={() => onRemove(work.id)}><X/></Button></div>
                    </Field>)}
                </RadioGroup>
            </FieldSet>
            {preview.works.length === 1 && <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onInspect(targetId)}><BookOpen data-icon="inline-start"/> Editions & suggested matches</Button>
                <Button variant="ghost" render={<Link to="/details/$mediaType/$mediaId" params={{mediaType: MediaType.BOOKS, mediaId: targetId}}/>}>View book page <ArrowRight data-icon="inline-end"/></Button>
            </div>}
            <div ref={conflictsSection}><BookMergeConflicts conflicts={preview.conflicts} workNames={workNames} choices={choices} setChoices={setChoices}/></div>
            {merge.isError && <Alert variant="destructive"><AlertTitle>Grouping was not applied</AlertTitle><AlertDescription>{merge.error.message} <Button variant="ghost" size="sm" onClick={onReload}>Reload comparison</Button></AlertDescription></Alert>}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
            {preview.works.length > 1 ? <>
                <div className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary"/>
                    <p className="min-w-0">Keep <span className="font-medium">{target.name}</span><span className="block text-xs text-muted-foreground">First published: {publicationDate?.slice(0, 4) ?? "Unknown"}{target.releaseDateSource === "edition" && publicationDate ? " · oldest edition" : ""}</span></p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" disabled={busy || refreshing} onClick={() => separate.mutate({data: {workIds: preview.works.map(work => work.id)}})}>Keep separate</Button>
                    <Button className="flex-1" disabled={!ready || busy || refreshing} onClick={() => merge.mutate({data: {workIds: preview.works.map(work => work.id), targetId,
                        version: preview.version, resolutions: preview.conflicts.map(row => choices[row.userId] as BookGroupMergeInput["resolutions"][number])}})}>
                        <GitMerge data-icon="inline-start"/>{merge.isPending ? "Merging…" : `Merge ${preview.works.length} works`}
                    </Button>
                </div>
            </> : <p className="text-sm text-muted-foreground">Select another work to compare and merge.</p>}
        </CardFooter>
    </Card>;
}
