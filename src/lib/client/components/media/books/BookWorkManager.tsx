import {useState} from "react";
import {Link, useNavigate} from "@tanstack/react-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowRight, BookOpen, GitMerge, RefreshCw, Search, Split} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {Input} from "@/lib/client/components/ui/input";
import {Badge} from "@/lib/client/components/ui/badge";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Empty, EmptyDescription, EmptyHeader, EmptyTitle} from "@/lib/client/components/ui/empty";
import type {BookMergeInput} from "@/lib/schemas/book-editions.schema";
import {getBookCatalogue, getBookMergePreview, getBookWorkManagement, postKeepBookWorksSeparate, postMergeBookWorks, postRefreshBookEdition, postSplitBookEdition} from "@/lib/server/functions/book-editions";


export function BookWorkManager({ initialWorkId }: { initialWorkId?: number }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [sourceId, setSourceId] = useState<number | null>(initialWorkId ?? null);
    const [comparison, setComparison] = useState<{ targetId: number; editionId?: number } | null>(null);
    const [splitEdition, setSplitEdition] = useState<{ id: number; name: string } | null>(null);
    const catalogue = useQuery({ queryKey: ["bookCatalogue", query, page], queryFn: () => getBookCatalogue({ data: { query, page } }) });
    const work = useQuery({ queryKey: ["bookWork", sourceId], queryFn: () => getBookWorkManagement({ data: { mediaId: sourceId! } }), enabled: sourceId !== null });
    const preview = useQuery({ queryKey: ["bookMergePreview", sourceId, comparison], enabled: sourceId !== null && comparison !== null,
        queryFn: () => getBookMergePreview({ data: { sourceId: sourceId!, ...comparison! } }), staleTime: 0 });
    const afterChange = async (mediaId: number) => {
        setSourceId(mediaId); setComparison(null); setSplitEdition(null);
        await navigate({ to: "/books/manage", search: { workId: mediaId }, replace: true });
        await queryClient.invalidateQueries();
    };
    const split = useMutation({ mutationFn: postSplitBookEdition, onSuccess: result => afterChange(result.mediaId), meta: { successToastMessage: "Edition moved to its own work." } });
    const refresh = useMutation({ mutationFn: postRefreshBookEdition, onSuccess: () => queryClient.invalidateQueries(), meta: { successToastMessage: "Edition information refreshed. Reader progress was preserved." } });

    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2"><Badge variant="outline" className="w-fit">Catalogue management</Badge>
                <h1 className="text-3xl font-semibold tracking-tight">Books & editions</h1>
                <p className="max-w-2xl text-muted-foreground">Bring editions of the same work together so readers share one book page.</p>
            </div>
            {sourceId && <Button variant="outline" render={<Link to="/details/$mediaType/$mediaId" params={{ mediaType: MediaType.BOOKS, mediaId: sourceId }}/>}>View book page <ArrowRight data-icon="inline-end"/></Button>}
        </div>

        <Card><CardHeader><CardTitle>Find a work</CardTitle><CardDescription>Search by title, Google Books ID, or ISBN. Select a work, then compare it with another.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4">
                <form onSubmit={event => { event.preventDefault(); setQuery(search); setPage(1); }}>
                    <FieldGroup className="flex-row items-end"><Field><FieldLabel htmlFor="book-catalogue-search">Search catalogue</FieldLabel>
                        <Input id="book-catalogue-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Title, ISBN, or Google Books ID"/>
                    </Field><Button type="submit"><Search data-icon="inline-start"/> Search</Button></FieldGroup>
                </form>
                {catalogue.isPending && <p role="status" className="text-sm text-muted-foreground">Loading books…</p>}
                {catalogue.isError && <Alert variant="destructive"><AlertTitle>Could not load the catalogue</AlertTitle><AlertDescription>{catalogue.error.message}</AlertDescription></Alert>}
                <div className="grid gap-2 md:grid-cols-2">
                    {catalogue.data?.items.map(item => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <img src={item.imageCover} alt="" className="aspect-2/3 w-10 rounded-sm object-cover"/>
                        <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p><p className="truncate text-xs text-muted-foreground">{item.authors}</p>
                            <p className="text-xs text-muted-foreground">{item.editions} edition{item.editions === 1 ? "" : "s"} · {item.readers} reader{item.readers === 1 ? "" : "s"}</p></div>
                        <Button variant={sourceId === item.id ? "secondary" : "outline"} size="sm" disabled={sourceId === item.id} onClick={() => {
                            if (sourceId) setComparison({ targetId: item.id });
                            else setSourceId(item.id);
                        }}>{sourceId === item.id ? "Selected" : sourceId ? "Compare" : "Select"}</Button>
                    </div>)}
                </div>
                {catalogue.data?.items.length === 0 && <Empty><EmptyHeader><EmptyTitle>No matching works</EmptyTitle><EmptyDescription>Try another title or identifier.</EmptyDescription></EmptyHeader></Empty>}
                <div className="flex items-center justify-between"><Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page}</span><Button variant="ghost" size="sm" disabled={!catalogue.data?.hasNextPage} onClick={() => setPage(page + 1)}>Next</Button></div>
            </CardContent>
        </Card>

        {work.isError && <Alert variant="destructive"><AlertTitle>Could not load this work</AlertTitle><AlertDescription>{work.error.message}</AlertDescription></Alert>}
        {work.data && <Card><CardHeader><div className="flex items-start justify-between gap-4"><div className="flex flex-col gap-2">
            <CardTitle>{work.data.work.name}</CardTitle><CardDescription>{work.data.editions.length} edition{work.data.editions.length === 1 ? "" : "s"} attached to this work</CardDescription></div>
            <Button variant="ghost" size="sm" onClick={() => { setSourceId(null); setComparison(null); }}>Choose another work</Button></div></CardHeader>
            <CardContent className="flex flex-col gap-6">
                {work.data.suggestions.length > 0 && <div className="flex flex-col gap-2"><p className="text-sm font-medium">Suggested matches</p>
                    {work.data.suggestions.map(candidate => <div key={candidate.mediaId} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                        <BookOpen className="size-4 text-muted-foreground"/><span className="flex-1 text-sm">{candidate.name}</span><Badge variant="secondary">{candidate.evidence}</Badge>
                        <Button size="sm" variant="outline" onClick={() => setComparison({ targetId: candidate.mediaId })}>Review match</Button>
                    </div>)}
                </div>}
                <Table><TableHeader><TableRow><TableHead>Edition</TableHead><TableHead>Publisher / language</TableHead><TableHead>Pages</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>{work.data.editions.map(edition => <TableRow key={edition.id}>
                        <TableCell><div className="flex items-center gap-3"><img src={edition.imageCover} alt="" className="w-9 aspect-2/3 rounded-sm object-cover"/>
                            <div><p className="font-medium">{edition.name}</p><p className="text-xs text-muted-foreground">{edition.isbns.join(", ") || edition.apiId}</p></div></div></TableCell>
                        <TableCell>{edition.publishers ?? "—"}<div className="text-xs text-muted-foreground">{edition.language ?? "Unknown language"} · {edition.releaseDate?.slice(0, 4) ?? "Unknown date"}</div></TableCell>
                        <TableCell>{edition.pages ?? "—"}</TableCell><TableCell><div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" disabled={refresh.isPending} aria-label={`Refresh ${edition.name}`} onClick={() => refresh.mutate({ data: { mediaId: sourceId!, editionId: edition.id } })}><RefreshCw/></Button>
                            {comparison && <Button size="sm" variant="outline" onClick={() => setComparison({ targetId: comparison.targetId, editionId: edition.id })}>Move edition</Button>}
                            <Button size="sm" variant="ghost" disabled={work.data.editions.length < 2} onClick={() => setSplitEdition({ id: edition.id, name: edition.name })}><Split data-icon="inline-start"/> Separate</Button>
                        </div></TableCell>
                    </TableRow>)}</TableBody>
                </Table>
                {work.data.history.length > 0 && <div className="flex flex-col gap-2"><p className="text-sm font-medium">Grouping history</p>
                    {work.data.history.map(event => <p key={event.id} className="text-xs text-muted-foreground">{event.createdAt} · {event.action} · Work {event.sourceWorkId} → {event.targetWorkId}</p>)}
                </div>}
            </CardContent>
        </Card>}
        {preview.isFetching && comparison && <p role="status" className="text-sm text-muted-foreground">Checking affected readers…</p>}
        {preview.isError && <Alert variant="destructive"><AlertTitle>Could not compare works</AlertTitle><AlertDescription>{preview.error.message}</AlertDescription></Alert>}
        {preview.data && comparison && <BookMergePanel key={`${preview.data.version}:${comparison.editionId ?? "all"}`} preview={preview.data} editionId={comparison.editionId} onSaved={afterChange} onReload={() => preview.refetch()}/>}

        <Dialog open={splitEdition !== null} onOpenChange={open => { if (!open) setSplitEdition(null); }}><DialogContent>
            <DialogHeader><DialogTitle>Give this edition its own work</DialogTitle><DialogDescription>Readers using this edition will move with it. Other editions will stay on the current work.</DialogDescription></DialogHeader>
            <form className="flex flex-col gap-6" onSubmit={event => { event.preventDefault(); if (splitEdition) split.mutate({ data: { editionId: splitEdition.id, name: splitEdition.name } }); }}>
                <FieldGroup><Field><FieldLabel htmlFor="split-work-name">Work title</FieldLabel><Input id="split-work-name" required value={splitEdition?.name ?? ""} onChange={event => setSplitEdition(current => current ? { ...current, name: event.target.value } : null)}/></Field></FieldGroup>
                <DialogFooter><Button type="submit" disabled={split.isPending}>Create separate work</Button></DialogFooter>
            </form>
        </DialogContent></Dialog>
    </div>;
}

function BookMergePanel({ preview, editionId, onSaved, onReload }: {
    preview: Awaited<ReturnType<typeof getBookMergePreview>>; editionId?: number;
    onSaved: (mediaId: number) => Promise<void>; onReload: () => void;
}) {
    const [metadata, setMetadata] = useState<"source" | "target">("target");
    const [resolutions, setResolutions] = useState<Record<number, Partial<BookMergeInput["resolutions"][number]>>>({});
    const merge = useMutation({ mutationFn: postMergeBookWorks, onSuccess: result => onSaved(result.mediaId), meta: { successToastMessage: "Book grouping updated." } });
    const separate = useMutation({ mutationFn: postKeepBookWorksSeparate, onSuccess: () => onSaved(preview.source.id), meta: { successToastMessage: "These works will be kept separate." } });
    const ready = preview.conflicts.every(row => resolutions[row.userId]?.keep && resolutions[row.userId]?.reading);
    return <Card><CardHeader><CardTitle>{editionId ? "Move one edition" : "Merge works"}</CardTitle>
        <CardDescription>{preview.source.name} → {preview.target.name} · {preview.affectedReaders} affected reader{preview.affectedReaders === 1 ? "" : "s"}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">{[preview.source, preview.target].map((work, index) => <div key={work.id} className="flex gap-4 rounded-lg border p-4">
                <img src={work.imageCover} alt="" className="aspect-2/3 w-16 self-start rounded-sm object-cover"/>
                <div className="flex flex-col gap-2"><Badge variant="outline" className="w-fit">{index === 0 ? "Source" : "Surviving work"}</Badge><p className="font-medium">{work.name}</p>
                    <p className="text-sm text-muted-foreground">{work.authors.join(", ") || "Author unknown"}</p>
                    <p className="text-sm text-muted-foreground">First published: {work.releaseDate?.slice(0, 4) ?? "Unknown"}</p>
                    {work.synopsis && <p className="line-clamp-4 text-sm text-muted-foreground">{work.synopsis}</p>}</div>
            </div>)}</div>
            {!editionId && <FieldGroup><Field><FieldLabel htmlFor="merge-metadata">Work information to keep</FieldLabel>
                <Select value={metadata} onValueChange={value => { if (value) setMetadata(value); }}><SelectTrigger id="merge-metadata" className="w-full"><SelectValue>{metadata === "target" ? preview.target.name : preview.source.name}</SelectValue></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem value="target">Target: {preview.target.name}</SelectItem><SelectItem value="source">Source: {preview.source.name}</SelectItem></SelectGroup></SelectContent></Select>
            </Field></FieldGroup>}
            {preview.conflicts.length > 0 && <>
                <Alert><AlertTitle>{preview.conflicts.length} {preview.conflicts.length === 1 ? "reader has" : "readers have"} both works</AlertTitle><AlertDescription>Choose the active entry to keep, then decide whether to combine reading totals or keep only that entry's totals. Original entries are retained in the grouping audit.</AlertDescription></Alert>
                {preview.conflicts.map(conflict => <div key={conflict.userId} className="flex flex-col gap-3 rounded-lg border p-4">
                    <p className="font-medium">{conflict.name}</p><div className="grid gap-3 sm:grid-cols-2">{[conflict.source, conflict.target].map((entry, index) => <p key={index} className="text-sm text-muted-foreground">
                        {index === 0 ? "Source" : "Target"}: {entry.editionName ?? "No edition"} · {entry.status} · {entry.total} pages read · {entry.redo} rereads · Rating {entry.rating ?? "—"}{entry.hasComment ? " · Has a private note" : ""}
                    </p>)}</div>
                    <FieldGroup className="sm:flex-row"><Field><FieldLabel htmlFor={`merge-entry-${conflict.userId}`}>Active entry, rating and note</FieldLabel>
                        <Select value={resolutions[conflict.userId]?.keep ?? null} onValueChange={value => { if (value) setResolutions(current => ({ ...current, [conflict.userId]: { ...current[conflict.userId], userId: conflict.userId, keep: value } })); }}>
                            <SelectTrigger id={`merge-entry-${conflict.userId}`} className="w-full"><SelectValue placeholder="Choose an entry">{resolutions[conflict.userId]?.keep ? `Keep ${resolutions[conflict.userId].keep} entry` : undefined}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="source">Keep source entry</SelectItem><SelectItem value="target">Keep target entry</SelectItem></SelectGroup></SelectContent>
                        </Select></Field><Field><FieldLabel htmlFor={`merge-totals-${conflict.userId}`}>Reading totals</FieldLabel>
                        <Select value={resolutions[conflict.userId]?.reading ?? null} onValueChange={value => { if (value) setResolutions(current => ({ ...current, [conflict.userId]: { ...current[conflict.userId], userId: conflict.userId, reading: value } })); }}>
                            <SelectTrigger id={`merge-totals-${conflict.userId}`} className="w-full"><SelectValue placeholder="Choose how to count">{resolutions[conflict.userId]?.reading === "combine" ? "Separate readings: combine totals" : resolutions[conflict.userId]?.reading === "duplicate" ? "Duplicate: keep selected totals" : undefined}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="combine">Separate readings: combine totals</SelectItem><SelectItem value="duplicate">Duplicate: keep selected totals</SelectItem></SelectGroup></SelectContent>
                        </Select></Field></FieldGroup>
                </div>)}
            </>}
            {merge.isError && <Alert variant="destructive"><AlertTitle>Grouping was not applied</AlertTitle><AlertDescription>{merge.error.message} <Button variant="ghost" size="sm" onClick={onReload}>Reload comparison</Button></AlertDescription></Alert>}
            <div className="flex flex-wrap justify-end gap-3">
                {!editionId && <Button variant="outline" disabled={separate.isPending || merge.isPending} onClick={() => separate.mutate({ data: { sourceId: preview.source.id, targetId: preview.target.id } })}>Keep separate</Button>}
                <Button disabled={!ready || merge.isPending || separate.isPending} onClick={() => merge.mutate({ data: {
                    sourceId: preview.source.id, targetId: preview.target.id, editionId, version: preview.version, metadata,
                    resolutions: preview.conflicts.map(row => resolutions[row.userId] as BookMergeInput["resolutions"][number]),
                } })}><GitMerge data-icon="inline-start"/>{editionId ? "Move edition" : "Merge into surviving work"}</Button>
            </div>
        </CardContent>
    </Card>;
}
