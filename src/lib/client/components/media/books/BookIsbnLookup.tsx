import {useId, useState} from "react";
import {Link} from "@tanstack/react-router";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {ArrowRight, Search} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {postSelectBookIsbnEdition, searchBookEditionByIsbn} from "@/lib/server/functions/book-editions";
import {Button} from "@/lib/client/components/ui/button";
import {Input} from "@/lib/client/components/ui/input";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {Empty, EmptyDescription, EmptyHeader, EmptyTitle} from "@/lib/client/components/ui/empty";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";

export function BookIsbnLookup({mediaId, onSelect}: {mediaId: number; onSelect: (id: number, pages: number | null) => void}) {
    const [open, setOpen] = useState(false);
    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" size="sm" variant="outline" className="self-start"/>}><Search data-icon="inline-start"/> Find edition by ISBN</DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>Find your edition</DialogTitle><DialogDescription>Enter the ISBN from your copy to find its language, cover and page count.</DialogDescription></DialogHeader>
            {open && <BookIsbnSearch mediaId={mediaId} onSelect={(id, pages) => {onSelect(id, pages); setOpen(false);}}/>}
        </DialogContent>
    </Dialog>;
}

function BookIsbnSearch({mediaId, onSelect}: {mediaId: number; onSelect: (id: number, pages: number | null) => void}) {
    const inputId = useId();
    const [isbn, setIsbn] = useState("");
    const queryClient = useQueryClient();
    const lookup = useMutation({mutationFn: searchBookEditionByIsbn});
    const select = useMutation({mutationFn: postSelectBookIsbnEdition, onSuccess: async result => {
        await Promise.all([
            queryClient.invalidateQueries({queryKey: ["bookEditions", mediaId]}),
            queryClient.invalidateQueries({queryKey: ["details", MediaType.BOOKS, mediaId]}),
            queryClient.invalidateQueries({queryKey: ["bookMergeSuggestions"]}),
        ]);
        if (result.mediaId === mediaId) onSelect(result.editionId, result.pages);
    }});
    const otherWork = select.data && select.data.mediaId !== mediaId ? select.data : null;
    return <div className="flex flex-col gap-5">
        <form onSubmit={event => {
            event.preventDefault(); event.stopPropagation(); select.reset();
            lookup.mutate({data: {mediaId, isbn}});
        }}>
            <FieldGroup><Field><FieldLabel htmlFor={inputId}>ISBN</FieldLabel>
                <div className="flex gap-2"><Input id={inputId} value={isbn} onChange={event => setIsbn(event.target.value)} placeholder="978-…" autoComplete="off" maxLength={32} required/>
                    <Button type="submit" disabled={lookup.isPending || select.isPending || !isbn.trim()}><Search data-icon="inline-start"/>{lookup.isPending ? "Searching…" : "Search"}</Button>
                </div><FieldDescription>10 or 13 digits. Spaces and hyphens are accepted.</FieldDescription>
            </Field></FieldGroup>
        </form>
        {(lookup.isError || select.isError) && <Alert variant="destructive"><AlertTitle>Could not find or select this edition</AlertTitle><AlertDescription>{lookup.error?.message ?? select.error?.message}</AlertDescription></Alert>}
        {otherWork ? <Alert><AlertTitle>This edition has its own book page</AlertTitle><AlertDescription>
            <p>{otherWork.reviewQueued ? "We could not confidently link it to this work. The possible match has been sent for review." : "This edition belongs to another work."} Your current reading stays saved.</p>
            <Button variant="outline" size="sm" render={<Link to="/details/$mediaType/$mediaId" params={{mediaType: MediaType.BOOKS, mediaId: otherWork.mediaId}} search={{editionId: otherWork.editionId}}/>}>Open this edition <ArrowRight data-icon="inline-end"/></Button>
        </AlertDescription></Alert> : lookup.data && !lookup.isPending && <div className="flex flex-col gap-3" aria-live="polite">
            {lookup.data.editions.map(edition => <div key={edition.apiId} className="flex items-start gap-4 rounded-lg border p-4">
                <img src={edition.imageCover} alt="" className="aspect-2/3 w-16 shrink-0 rounded-sm object-cover"/>
                <div className="flex min-w-0 flex-1 flex-col gap-2"><p className="font-medium leading-snug">{edition.name}</p>
                    <p className="text-sm text-muted-foreground">{edition.authors.join(", ") || "Author unknown"}</p>
                    <p className="text-xs text-muted-foreground">{[edition.language ? formatLocaleName(edition.language, "language") : null, edition.publishers,
                        edition.releaseDate?.slice(0, 4), edition.pages ? `${edition.pages} pages` : "Page count unknown"].filter(Boolean).join(" · ")}</p>
                    <Button type="button" variant="secondary" size="sm" className="self-start" disabled={select.isPending} onClick={() => select.mutate({data: {mediaId, isbn: lookup.data!.isbn, apiId: edition.apiId}})}>
                        {select.isPending && select.variables?.data.apiId === edition.apiId ? "Selecting…" : "Use this edition"}
                    </Button>
                </div>
            </div>)}
            {lookup.data.editions.length === 0 && <Empty><EmptyHeader><EmptyTitle>No edition found</EmptyTitle><EmptyDescription>Google Books has no matching edition for this ISBN. Check the number, or choose an existing edition and adjust its page count.</EmptyDescription></EmptyHeader></Empty>}
        </div>}
    </div>;
}
