import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowRight, ChevronLeft, ChevronRight, ScanSearch} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {getBookMergeSuggestions, postScanBookWorks} from "@/lib/server/functions/book-editions";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";

export function BookReviewQueue({selectedIds, onReview, busy}: {selectedIds: number[]; onReview: (ids: number[]) => void; busy: boolean}) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [confidence, setConfidence] = useState<"all" | "high" | "possible" | "author">("all");
    const queue = useQuery({queryKey: ["bookMergeSuggestions", page, confidence], queryFn: () => getBookMergeSuggestions({data: {page, confidence}})});
    const scan = useMutation({mutationFn: () => postScanBookWorks(), onSuccess: async () => {
        setPage(1); await queryClient.invalidateQueries({queryKey: ["bookMergeSuggestions"]});
    }, meta: {successToastMessage: "Review queue updated from your catalogue."}});
    const selectedKey = [...selectedIds].sort((a, b) => a - b).join(":");
    const groups = queue.data?.groups ?? [];
    const currentIndex = groups.findIndex(group => group.key === selectedKey);
    const next = groups[currentIndex + 1];
    return <Card className="min-h-0 min-w-0">
        <CardHeader><div className="flex items-start justify-between gap-3"><div className="flex flex-col gap-2"><CardTitle>Merge review</CardTitle>
            <CardDescription>Strongest matches first, then the books with the most readers.</CardDescription></div>
            <Button size="sm" variant="outline" disabled={scan.isPending || busy} onClick={() => scan.mutate()}><ScanSearch data-icon="inline-start"/>{scan.isPending ? "Scanning…" : "Scan books"}</Button>
        </div>
            <ToggleGroup aria-label="Review category" variant="outline" size="sm" spacing={1} value={[confidence]} onValueChange={values => {
                if (values[0]) {setConfidence(values[0] as typeof confidence); setPage(1);}
            }} className="mt-3 grid w-full grid-cols-2 sm:flex">
                <ToggleGroupItem value="all" className="flex-1">All matches</ToggleGroupItem>
                <ToggleGroupItem value="high" className="flex-1">High confidence</ToggleGroupItem>
                <ToggleGroupItem value="possible" className="flex-1">Possible</ToggleGroupItem>
                <ToggleGroupItem value="author" className="flex-1">By author</ToggleGroupItem>
            </ToggleGroup>
            <p className="mt-2 text-xs text-muted-foreground">Uses stored titles, authors, identifiers and edition details. No API calls.</p>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
            {confidence === "author" && <Alert><AlertTitle>Find translations by author</AlertTitle><AlertDescription>These works share an author, even when their titles differ. Remove unrelated books from the comparison before merging.</AlertDescription></Alert>}
            {(queue.isError || scan.isError) && <Alert variant="destructive"><AlertTitle>Could not update the review queue</AlertTitle><AlertDescription>{queue.error?.message ?? scan.error?.message}</AlertDescription></Alert>}
            {queue.isPending && <p role="status" className="py-8 text-center text-muted-foreground">Loading suggestions…</p>}
            {groups.map(group => <article key={group.key} className={cn("flex flex-col gap-3 rounded-lg border p-4", group.key === selectedKey && "border-primary/40 bg-primary/5")}>
                <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant={group.confidence === "high" ? "secondary" : "outline"}>{{high: "High confidence", possible: "Possible match", author: "Author review"}[group.confidence]}</Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">{group.works.length} works · {group.readers} list entries</span>
                </div>
                <ul className="flex flex-col gap-2">{group.works.slice(0, 4).map(work => <li key={work.id} className="flex items-center gap-3">
                    <img src={work.imageCover} alt="" className="aspect-2/3 w-7 shrink-0 rounded-sm object-cover"/>
                    <span className="min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-snug">{work.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{work.readers} reader{work.readers === 1 ? "" : "s"}</span>
                </li>)}</ul>
                {group.works.length > 4 && <p className="text-xs text-muted-foreground">+ {group.works.length - 4} more works in this group</p>}
                <p className="text-xs text-muted-foreground">{group.evidence.join(" · ")}</p>
                <Button variant={group.key === selectedKey ? "secondary" : "outline"} size="sm" disabled={busy} onClick={() => onReview(group.workIds)}>
                    {group.key === selectedKey ? "Reviewing this group" : `Review ${group.works.length} works`} <ArrowRight data-icon="inline-end"/>
                </Button>
            </article>)}
            {queue.data && groups.length === 0 && <Empty><EmptyHeader><EmptyMedia variant="icon"><ScanSearch/></EmptyMedia><EmptyTitle>No pending matches</EmptyTitle>
                <EmptyDescription>{confidence === "author" ? "No unreviewed works share an author in the current catalogue." : "Run a scan for matching works, or try By author to find translations with different titles."}</EmptyDescription>
            </EmptyHeader></Empty>}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
            <Button disabled={busy || !next || queue.isFetching} onClick={next ? () => onReview(next.workIds) : undefined}>Review next <ArrowRight data-icon="inline-end"/></Button>
            <div className="flex items-center justify-between gap-2"><Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft data-icon="inline-start"/> Previous</Button>
                <span className="text-xs tabular-nums text-muted-foreground">{queue.data?.total ?? "…"} groups · Page {page}</span>
                <Button size="sm" variant="ghost" disabled={!queue.data?.hasNextPage} onClick={() => setPage(page + 1)}>Next <ChevronRight data-icon="inline-end"/></Button>
            </div>
        </CardFooter>
    </Card>;
}
