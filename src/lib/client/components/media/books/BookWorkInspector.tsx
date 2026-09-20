import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {useIsMutating, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowRight, Check, MoveRight, Pencil, Plus, RefreshCw, Split} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/formatting/date";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {BOOK_WORK_SELECTION_LIMIT} from "@/lib/schemas/book-editions.schema";
import {Button} from "@/lib/client/components/ui/button";
import {Input} from "@/lib/client/components/ui/input";
import {Badge} from "@/lib/client/components/ui/badge";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {BookMergeConflicts, type BookReaderChoices} from "./BookMergeConflicts";
import {getBookMergePreview, getBookWorkManagement, postMergeBookWorks, postRefreshBookEdition, postSplitBookEdition} from "@/lib/server/functions/book-editions";
import type {getBookGroupPreview} from "@/lib/server/functions/book-editions";

type SelectedWorks = Awaited<ReturnType<typeof getBookGroupPreview>>["works"];
type Edition = Awaited<ReturnType<typeof getBookWorkManagement>>["editions"][number];

export function BookWorkInspector({mediaId, onClose, selectedWorks, selectedIds, onSelect, onSaved}: {
    mediaId: number | null; onClose: () => void; selectedWorks: SelectedWorks; selectedIds: number[];
    onSelect: (id: number) => void; onSaved: (id: number) => Promise<void>;
}) {
    const queryClient = useQueryClient();
    const grouping = useIsMutating({mutationKey: ["bookGrouping"]}) > 0;
    const [splitEdition, setSplitEdition] = useState<{id: number; name: string} | null>(null);
    const [movingEdition, setMovingEdition] = useState<Edition | null>(null);
    const work = useQuery({queryKey: ["bookWork", mediaId], queryFn: () => getBookWorkManagement({data: {mediaId: mediaId!}}), enabled: mediaId !== null});
    const refresh = useMutation({mutationFn: postRefreshBookEdition, onSuccess: () => queryClient.invalidateQueries(), meta: {successToastMessage: "Edition refreshed. Reader progress was preserved."}});
    const split = useMutation({mutationKey: ["bookGrouping"], mutationFn: postSplitBookEdition, onSuccess: result => onSaved(result.mediaId), meta: {successToastMessage: "Edition moved to its own work."}});
    const targets = selectedWorks.filter(item => item.id !== mediaId);
    return <Sheet open={mediaId !== null} onOpenChange={open => {if (!open) onClose();}}>
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
            <SheetHeader className="gap-2 border-b pr-12"><SheetTitle>{work.data?.work.name ?? "Book details"}</SheetTitle>
                <SheetDescription>{work.data ? `${work.data.editions.length} editions attached to this work` : "Edition information and suggested matches."}</SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
                {work.isPending && <p role="status">Loading editions…</p>}
                {work.isError && <Alert variant="destructive"><AlertTitle>Could not load this work</AlertTitle><AlertDescription>{work.error.message}</AlertDescription></Alert>}
                {work.data && <>
                    <div className="flex items-start gap-4"><img src={work.data.work.imageCover} alt="" className="aspect-2/3 w-16 shrink-0 rounded-sm object-cover"/>
                        <div className="flex min-w-0 flex-1 flex-col gap-3"><p>First published: {formatDate(work.data.work.releaseDate)}
                            <span className="block text-xs text-muted-foreground">{work.data.work.releaseDateSource === "edition" ? "Based on the oldest known edition" : work.data.work.releaseDateSource === "manual" ? "Manually set" : "From Open Library"}</span></p>
                            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={grouping || selectedIds.includes(mediaId!) || selectedIds.length >= BOOK_WORK_SELECTION_LIMIT} onClick={() => onSelect(mediaId!)}>
                                {selectedIds.includes(mediaId!) ? <Check data-icon="inline-start"/> : <Plus data-icon="inline-start"/>}{selectedIds.includes(mediaId!) ? "Selected" : "Add to selection"}</Button>
                                <Button size="sm" variant="ghost" render={<Link to="/details/edit/$mediaType/$mediaId" params={{mediaType: MediaType.BOOKS, mediaId: mediaId!}}/>}><Pencil data-icon="inline-start"/> Edit work</Button>
                                <Button size="sm" variant="ghost" render={<Link to="/details/$mediaType/$mediaId" params={{mediaType: MediaType.BOOKS, mediaId: mediaId!}}/>}>View book page <ArrowRight data-icon="inline-end"/></Button>
                            </div>
                        </div>
                    </div>
                    {work.data.work.synopsis && <p className="text-sm leading-relaxed text-muted-foreground">{work.data.work.synopsis}</p>}
                    {work.data.suggestions.length > 0 && <section className="flex flex-col gap-3" aria-label="Suggested matches"><h3 className="font-medium">Suggested matches</h3>
                        {work.data.suggestions.map(candidate => <div key={candidate.mediaId} className="flex items-center gap-3 rounded-lg border p-3">
                            <div className="flex min-w-0 flex-1 flex-col gap-2"><p>{candidate.name}</p><Badge variant="outline" className="w-fit">{candidate.evidence}</Badge></div>
                            <Button size="sm" variant="outline" disabled={grouping || selectedIds.includes(candidate.mediaId) || selectedIds.length >= BOOK_WORK_SELECTION_LIMIT}
                                onClick={() => onSelect(candidate.mediaId)}>{selectedIds.includes(candidate.mediaId) ? "Selected" : "Add to selection"}</Button>
                        </div>)}
                    </section>}
                    <section className="flex flex-col gap-3" aria-label="Editions"><h3 className="font-medium">Editions</h3>
                        {!targets.length && <p className="text-xs text-muted-foreground">To move an edition to another work, add that work to your catalogue selection.</p>}
                        {work.data.editions.map(edition => <section key={edition.id} className="flex flex-col gap-3 rounded-lg border p-3" aria-label={`Edition ${edition.name}`}>
                            <div className="flex items-start gap-3"><img src={edition.imageCover} alt="" className="aspect-2/3 w-10 shrink-0 rounded-sm object-cover"/>
                                <div className="flex min-w-0 flex-1 flex-col gap-1"><p className="font-medium">{edition.name}</p>
                                    <p className="text-xs text-muted-foreground">{edition.authors.join(", ")}</p>
                                    <p className="text-xs text-muted-foreground">{edition.publishers ?? "Publisher unknown"} · {edition.language ? formatLocaleName(edition.language, "language") : "Language unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{edition.pages === null ? "Pages unknown" : `${edition.pages} pages`} · Published {formatDate(edition.releaseDate)}</p>
                                    <p className="break-words text-xs text-muted-foreground">{edition.isbns.length ? `ISBN ${edition.isbns.join(", ")}` : `Google Books: ${edition.apiId}`}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="ghost" disabled={grouping || refresh.isPending} aria-label={`Refresh ${edition.name}`} onClick={() => refresh.mutate({data: {mediaId: mediaId!, editionId: edition.id}})}><RefreshCw data-icon="inline-start"/> Refresh</Button>
                                <Button size="sm" variant="outline" disabled={grouping || !targets.length} onClick={() => setMovingEdition(edition)}><MoveRight data-icon="inline-start"/> Move</Button>
                                <Button size="sm" variant="outline" disabled={grouping || work.data.editions.length < 2} onClick={() => setSplitEdition({id: edition.id, name: edition.name})}><Split data-icon="inline-start"/> Separate</Button>
                            </div>
                        </section>)}
                    </section>
                    {work.data.history.length > 0 && <section className="flex flex-col gap-2" aria-label="Grouping history"><h3 className="font-medium">Grouping history</h3>
                        {work.data.history.map(event => <p key={event.id} className="text-xs text-muted-foreground">{event.createdAt} · {event.action} · Work {event.sourceWorkId} → {event.targetWorkId}</p>)}
                    </section>}
                </>}
            </div>
            <Dialog open={splitEdition !== null} onOpenChange={open => {if (!open) setSplitEdition(null);}}><DialogContent>
                <DialogHeader><DialogTitle>Give this edition its own work</DialogTitle><DialogDescription>Readers using this edition will move with it. Other editions will stay on the current work.</DialogDescription></DialogHeader>
                <form className="flex flex-col gap-6" onSubmit={event => {event.preventDefault(); if (splitEdition) split.mutate({data: {editionId: splitEdition.id, name: splitEdition.name}});}}>
                    <FieldGroup><Field><FieldLabel htmlFor="split-work-name">Work title</FieldLabel><Input id="split-work-name" required value={splitEdition?.name ?? ""} onChange={event => setSplitEdition(current => current ? {...current, name: event.target.value} : null)}/></Field></FieldGroup>
                    <DialogFooter><Button type="submit" disabled={split.isPending}>Create separate work</Button></DialogFooter>
                </form>
            </DialogContent></Dialog>
            {movingEdition && <MoveBookEditionDialog edition={movingEdition} targets={targets} onClose={() => setMovingEdition(null)} onSaved={onSaved}/>}
        </SheetContent>
    </Sheet>;
}

function MoveBookEditionDialog({edition, targets, onClose, onSaved}: {edition: Edition; targets: SelectedWorks; onClose: () => void; onSaved: (id: number) => Promise<void>}) {
    const grouping = useIsMutating({mutationKey: ["bookGrouping"]}) > 0;
    const [targetId, setTargetId] = useState(targets[0].id);
    const preview = useQuery({queryKey: ["bookMergePreview", edition.mediaId, targetId, edition.id],
        queryFn: () => getBookMergePreview({data: {sourceId: edition.mediaId, targetId, editionId: edition.id}}), refetchOnWindowFocus: false});
    return <Dialog open onOpenChange={open => {if (!open) onClose();}}><DialogContent className="flex max-h-[85dvh] flex-col">
        <DialogHeader><DialogTitle>Move edition</DialogTitle><DialogDescription>Move {edition.name} and its readers to another selected work.</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel htmlFor="move-edition-target">Destination work</FieldLabel>
            <Select value={String(targetId)} disabled={grouping} onValueChange={value => {if (value) setTargetId(Number(value));}}>
                <SelectTrigger id="move-edition-target" className="w-full"><SelectValue>{targets.find(work => work.id === targetId)!.name}</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>{targets.map(work => <SelectItem key={work.id} value={String(work.id)}>{work.name} · #{work.id}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
        </Field></FieldGroup>
        {preview.isPending && <p role="status">Checking readers…</p>}
        {preview.isError && <Alert variant="destructive"><AlertTitle>Could not preview this move</AlertTitle><AlertDescription>{preview.error.message}</AlertDescription></Alert>}
        {preview.data && <BookEditionMove key={preview.data.version} preview={preview.data} editionId={edition.id} onSaved={onSaved} onReload={() => preview.refetch()} refreshing={preview.isFetching}/>}
    </DialogContent></Dialog>;
}

function BookEditionMove({preview, editionId, onSaved, onReload, refreshing}: {
    preview: Awaited<ReturnType<typeof getBookMergePreview>>; editionId: number; onSaved: (id: number) => Promise<void>; onReload: () => void; refreshing: boolean;
}) {
    const [choices, setChoices] = useState<BookReaderChoices>({});
    const move = useMutation({mutationKey: ["bookGrouping"], mutationFn: postMergeBookWorks, onSuccess: result => onSaved(result.mediaId), meta: {successToastMessage: "Edition moved."}});
    const ready = preview.conflicts.every(row => choices[row.userId]?.keepWorkId && choices[row.userId]?.reading);
    return <>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <p className="text-sm text-muted-foreground">{preview.affectedReaders} affected readers</p>
            <BookMergeConflicts conflicts={preview.conflicts.map(row => ({userId: row.userId, name: row.name, entries: [{...row.source, workId: preview.source.id}, {...row.target, workId: preview.target.id}]}))}
                workNames={new Map([preview.source, preview.target].map(work => [work.id, `${work.name} · #${work.id}`]))} choices={choices} setChoices={setChoices}/>
            {move.isError && <Alert variant="destructive"><AlertTitle>Edition was not moved</AlertTitle><AlertDescription>{move.error.message} <Button variant="ghost" size="sm" onClick={onReload}>Reload comparison</Button></AlertDescription></Alert>}
        </div>
        <DialogFooter><Button disabled={!ready || move.isPending || refreshing} onClick={() => move.mutate({data: {sourceId: preview.source.id, targetId: preview.target.id, editionId, version: preview.version, metadata: "target",
            resolutions: preview.conflicts.map(row => ({userId: row.userId, keep: choices[row.userId].keepWorkId === preview.source.id ? "source" : "target", reading: choices[row.userId].reading!})),
        }})}><MoveRight data-icon="inline-start"/>{move.isPending ? "Moving…" : "Move edition"}</Button></DialogFooter>
    </>;
}
