import {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {BookOpen, Plus} from "lucide-react";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {PROGRESS_MAX} from "@/lib/utils/constants";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {getBookEditions} from "@/lib/server/functions/book-editions";
import {BookIsbnLookup} from "./BookIsbnLookup";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import type {MediaUserDetailsProps} from "@/lib/client/components/media/media-config.types";
import {useAddMediaToListMutation, useUpdateUserMediaMutation, type UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";


function BookEditionSelect({ mediaId, editionId, onChange }: {
    mediaId: number; editionId: number | null; onChange: (id: number | null, pages: number | null) => void;
}) {
    const selectId = useId();
    const editions = useQuery({ queryKey: ["bookEditions", mediaId], queryFn: () => getBookEditions({ data: { mediaId } }) });
    const selected = editions.data?.find(edition => edition.id === editionId);
    const label = (edition: NonNullable<typeof editions.data>[number]) => [edition.name,
        edition.language ? formatLocaleName(edition.language, "language") : null,
        edition.publishers, edition.pages ? `${edition.pages} pages` : "Page count unknown",
    ].filter(Boolean).join(" · ");
    return (
        <Field>
            <FieldLabel htmlFor={selectId}>Your edition</FieldLabel>
            <Select value={editionId === null ? "none" : String(editionId)} onValueChange={value => {
                const edition = editions.data?.find(item => String(item.id) === value);
                onChange(edition?.id ?? null, edition?.pages ?? null);
            }} disabled={editions.isPending || editions.isError}>
                <SelectTrigger id={selectId} className="w-full"><SelectValue>{selected ? label(selected) : "Choose later"}</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>
                    <SelectItem value="none">Choose later</SelectItem>
                    {editions.data?.map(edition => <SelectItem key={edition.id} value={String(edition.id)}>{label(edition)}</SelectItem>)}
                </SelectGroup></SelectContent>
            </Select>
            <BookIsbnLookup mediaId={mediaId} onSelect={onChange}/>
            {editions.isError && <FieldDescription>Could not load editions. <Button variant="ghost" size="sm" onClick={() => editions.refetch()}>Retry</Button></FieldDescription>}
            {selected && <div className="flex items-start gap-3 pt-2">
                <img src={selected.imageCover} alt={selected.name} className="w-12 rounded-sm aspect-2/3 object-cover"/>
                <div className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">
                    <span>{selected.publishers ?? "Publisher unknown"}</span>
                    <span>{selected.language ? formatLocaleName(selected.language, "language") : "Language unknown"}{selected.releaseDate ? ` · ${selected.releaseDate.slice(0, 4)}` : ""}</span>
                    {selected.isbns.length > 0 && <span>ISBN {selected.isbns.join(", ")}</span>}
                    <a href={`https://books.google.com/books?id=${encodeURIComponent(selected.apiId)}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">View this edition on Google Books</a>
                </div>
            </div>}
        </Field>
    );
}

export function BookAddToList({ mediaId, initialEditionId, queryOption, onEditionChange }: {
    mediaId: number; initialEditionId?: number; queryOption: UserMediaQueryOption; onEditionChange: (id: number | null) => void;
}) {
    const [editionId, setEditionId] = useState<number | null>(initialEditionId ?? null);
    const mutation = useAddMediaToListMutation(queryOption);
    return <Card>
        <CardHeader><CardTitle>Add to your reading list</CardTitle><CardDescription>Choose your edition, or save this work for later.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
            <FieldGroup><BookEditionSelect mediaId={mediaId} editionId={editionId} onChange={id => {setEditionId(id); onEditionChange(id);}}/></FieldGroup>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ data: { mediaType: MediaType.BOOKS, mediaId, editionId } })}>
                <Plus data-icon="inline-start"/> Add to List
            </Button>
        </CardContent>
    </Card>;
}

export function BookEditionDialog({ userMedia, queryOption, mutationOptions }: Omit<MediaUserDetailsProps<typeof MediaType.BOOKS>, "mediaType">) {
    const [open, setOpen] = useState(false);
    return <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Your edition</span>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm"/>}><BookOpen data-icon="inline-start"/> Change edition</DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Your reading edition</DialogTitle><DialogDescription>Choose the edition you are reading and its page count. Previous reread totals stay recorded.</DialogDescription></DialogHeader>
                    {open && <BookEditionForm userMedia={userMedia} queryOption={queryOption} mutationOptions={mutationOptions} onSaved={() => setOpen(false)}/>}
                </DialogContent>
            </Dialog>
        </div>
        <p className="text-sm">{userMedia.editionName ?? "No edition selected"}</p>
        <p className="text-xs text-muted-foreground">{[
            userMedia.publishers,
            userMedia.language ? formatLocaleName(userMedia.language, "language") : null,
            userMedia.pages === null ? "Page count unknown" : `${userMedia.pages} pages`,
        ].filter(Boolean).join(" · ")}</p>
    </div>;
}

function BookEditionForm({ userMedia, queryOption, mutationOptions, onSaved }: Omit<MediaUserDetailsProps<typeof MediaType.BOOKS>, "mediaType"> & { onSaved: () => void }) {
    const [editionId, setEditionId] = useState(userMedia.editionId);
    const [pages, setPages] = useState(userMedia.pages?.toString() ?? "");
    const mutation = useUpdateUserMediaMutation(MediaType.BOOKS, userMedia.mediaId, queryOption, mutationOptions);
    return <form className="flex flex-col gap-6" onSubmit={event => {
        event.preventDefault();
        mutation.mutate({ payload: { type: UpdateType.EDITION, edition: { editionId, pages: pages === "" ? null : Number(pages) } } }, {
            onSuccess: data => { if (data) onSaved(); },
        });
    }}>
        <FieldGroup>
            <BookEditionSelect mediaId={userMedia.mediaId} editionId={editionId} onChange={(id, count) => { setEditionId(id); setPages(count?.toString() ?? ""); }}/>
            <Field><FieldLabel htmlFor="book-edition-pages">Pages in your copy</FieldLabel>
                <Input id="book-edition-pages" type="number" min={1} max={PROGRESS_MAX} step={1} value={pages} onChange={event => setPages(event.target.value)} placeholder="Unknown"/>
                <FieldDescription>You can correct this for your copy. A completed reading will use this corrected page count.</FieldDescription>
            </Field>
        </FieldGroup>
        <DialogFooter><Button type="submit" disabled={mutation.isPending}>Save edition</Button></DialogFooter>
    </form>;
}
