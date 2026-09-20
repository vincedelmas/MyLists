import {useId, type Dispatch, type SetStateAction} from "react";
import type {BookGroupMergeInput} from "@/lib/schemas/book-editions.schema";
import type {getBookGroupPreview} from "@/lib/server/functions/book-editions";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";

export type BookReaderChoices = Record<number, Partial<BookGroupMergeInput["resolutions"][number]>>;

export function BookMergeConflicts({conflicts, workNames, choices, setChoices}: {
    conflicts: Awaited<ReturnType<typeof getBookGroupPreview>>["conflicts"];
    workNames: Map<number, string>;
    choices: BookReaderChoices;
    setChoices: Dispatch<SetStateAction<BookReaderChoices>>;
}) {
    const fieldId = useId();
    if (!conflicts.length) return null;
    return <div className="flex flex-col gap-4">
        <Alert><AlertTitle>{conflicts.length} {conflicts.length === 1 ? "reader has" : "readers have"} overlapping entries</AlertTitle>
            <AlertDescription>Choose each reader’s active entry, rating and note. Count separate readings together, or retain only the chosen duplicate’s totals.</AlertDescription>
        </Alert>
        {conflicts.length > 1 && <FieldGroup><Field><FieldLabel htmlFor={`${fieldId}-all`}>Set reading totals for all overlaps</FieldLabel>
            <Select value={null} onValueChange={value => { if (value) setChoices(current => Object.fromEntries(conflicts.map(row => [row.userId, {...current[row.userId], userId: row.userId, reading: value}]))); }}>
                <SelectTrigger id={`${fieldId}-all`} className="w-full"><SelectValue placeholder="Apply a counting rule…"/></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="combine">Separate readings: combine all totals</SelectItem><SelectItem value="duplicate">Duplicates: keep chosen totals</SelectItem></SelectGroup></SelectContent>
            </Select>
        </Field></FieldGroup>}
        {conflicts.map(conflict => {
            const choice = choices[conflict.userId];
            return <section key={conflict.userId} className="flex flex-col gap-3 rounded-lg border p-3" aria-label={`Resolve ${conflict.name}`}>
                <p className="font-medium">{conflict.name}</p>
                <div className="flex flex-col gap-2">{conflict.entries.map(entry => <p key={entry.workId} className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{workNames.get(entry.workId)}</span><br/>
                    {entry.editionName ?? "No edition"} · {entry.status} · {entry.total} pages read · {entry.redo} rereads · Rating {entry.rating ?? "—"}{entry.hasComment ? " · Has a note" : ""}
                </p>)}</div>
                <FieldGroup>
                    <Field><FieldLabel htmlFor={`${fieldId}-entry-${conflict.userId}`}>Active entry, rating and note</FieldLabel>
                        <Select value={choice?.keepWorkId?.toString() ?? null} onValueChange={value => { if (value) setChoices(current => ({...current, [conflict.userId]: {...current[conflict.userId], userId: conflict.userId, keepWorkId: Number(value)}})); }}>
                            <SelectTrigger id={`${fieldId}-entry-${conflict.userId}`} className="w-full"><SelectValue placeholder="Choose an entry">{choice?.keepWorkId ? workNames.get(choice.keepWorkId) : undefined}</SelectValue></SelectTrigger>
                            <SelectContent><SelectGroup>{conflict.entries.map(entry => <SelectItem key={entry.workId} value={String(entry.workId)}>{workNames.get(entry.workId)}</SelectItem>)}</SelectGroup></SelectContent>
                        </Select>
                    </Field>
                    <Field><FieldLabel htmlFor={`${fieldId}-totals-${conflict.userId}`}>Reading totals</FieldLabel>
                        <Select value={choice?.reading ?? null} onValueChange={value => { if (value) setChoices(current => ({...current, [conflict.userId]: {...current[conflict.userId], userId: conflict.userId, reading: value}})); }}>
                            <SelectTrigger id={`${fieldId}-totals-${conflict.userId}`} className="w-full"><SelectValue placeholder="Choose how to count">{choice?.reading === "combine" ? "Combine all reading totals" : choice?.reading === "duplicate" ? "Keep chosen entry’s totals" : undefined}</SelectValue></SelectTrigger>
                            <SelectContent><SelectGroup><SelectItem value="combine">Separate readings: combine all totals</SelectItem><SelectItem value="duplicate">Duplicates: keep chosen totals</SelectItem></SelectGroup></SelectContent>
                        </Select>
                    </Field>
                </FieldGroup>
            </section>;
        })}
    </div>;
}
