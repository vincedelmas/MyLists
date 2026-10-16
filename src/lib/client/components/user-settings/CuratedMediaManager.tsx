import {useQuery} from "@tanstack/react-query";
import {toItemKey} from "@/lib/utils/media/item-key";
import {ArrowDown, ArrowUp, Trash2} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {useFieldArray, useFormContext} from "react-hook-form";
import {Dispatch, SetStateAction, useId, useState} from "react";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {SearchSelect} from "@/lib/client/components/general/SearchSelect";
import {profileCustomSearchOptions} from "@/lib/client/react-query/query-options";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {HighlightedMediaRef, HighlightedMediaSearchItem, HighlightedMediaSettings, HighlightedMediaTab, PROFILE_MAX_HIGHLIGHTED_MEDIA} from "@/lib/types/profile-custom.types";


interface CuratedMediaManagerProps {
    activeTab: HighlightedMediaTab;
    previewCache: Record<string, HighlightedMediaSearchItem>;
    setPreviewCache: Dispatch<SetStateAction<Record<string, HighlightedMediaSearchItem>>>;
}


export const CuratedMediaManager = ({ activeTab, previewCache, setPreviewCache }: CuratedMediaManagerProps) => {
    const fieldId = useId();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const { clearErrors, control } = useFormContext<HighlightedMediaSettings>();
    const { fields, append, remove, swap } = useFieldArray({ control, name: `${activeTab}.items` });

    const isAtLimit = fields.length >= PROFILE_MAX_HIGHLIGHTED_MEDIA;
    const selectedKeys = new Set(fields.map((f) => toItemKey(f)));
    const { data: searchResults, isFetching, error } = useQuery(profileCustomSearchOptions(activeTab, debouncedSearch));

    const handleAddItem = (item: HighlightedMediaSearchItem) => {
        if (selectedKeys.has(toItemKey(item)) || fields.length >= PROFILE_MAX_HIGHLIGHTED_MEDIA) {
            return;
        }

        setPreviewCache((prev) => ({ ...prev, [toItemKey(item)]: item }));
        append({ mediaId: item.mediaId, mediaType: item.mediaType });
    };

    return (
        <FieldGroup className="gap-6 border-t pt-6">
            <Field>
                <FieldLabel htmlFor={`${fieldId}-search`}>
                    Add media
                </FieldLabel>
                <SearchSelect
                    error={error}
                    search={search}
                    getItemKey={toItemKey}
                    inputClassName="text-xs"
                    id={`${fieldId}-search`}
                    onSelect={handleAddItem}
                    items={searchResults ?? []}
                    getItemLabel={item => item.mediaName}
                    emptyMessage="No matching media found in your list."
                    isPending={isFetching || search !== debouncedSearch}
                    isItemDisabled={item => selectedKeys.has(toItemKey(item)) || isAtLimit}
                    onSearchChange={(val) => {
                        setSearch(val);
                        if (!val) clearErrors("root");
                    }}
                    placeholder={activeTab === "overview"
                        ? "Search in your lists..."
                        : `Search in your ${activeTab} list...`
                    }
                    renderItem={item =>
                        <>
                            <img
                                alt=""
                                src={item.mediaCover}
                                className="h-14 w-10 shrink-0 rounded object-cover"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="line-clamp-1 font-medium">
                                    {item.mediaName}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                    {item.mediaType}
                                </div>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">
                            {selectedKeys.has(toItemKey(item))
                                ? "Added"
                                : isAtLimit && "Limit reached"
                            }
                        </span>
                        </>
                    }
                />
                <FieldDescription className="text-xs">
                    Search only uses your list data. Overview can mix media types.
                </FieldDescription>
            </Field>

            <FieldSet>
                <FieldLegend variant="label">Chosen titles</FieldLegend>
                <FieldDescription>
                    Up to {PROFILE_MAX_HIGHLIGHTED_MEDIA} items. Use arrows to control order.
                </FieldDescription>

                {fields.length === 0 ?
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No media selected yet.
                    </div>
                    :
                    <div className="flex flex-col gap-2">
                        {fields.map((field: any, idx) => {
                            const itemKey = toItemKey(field);
                            const preview = previewCache[itemKey] || searchResults?.find(r => toItemKey(r) === itemKey);

                            return (
                                <CuratedItemRow
                                    idx={idx}
                                    item={field}
                                    onMove={swap}
                                    key={field.id}
                                    preview={preview}
                                    onRemove={remove}
                                    total={fields.length}
                                />
                            );
                        })}
                    </div>
                }
            </FieldSet>
        </FieldGroup>
    )
}


interface CuratedItemRowProps {
    idx: number;
    total: number;
    item: HighlightedMediaRef;
    onRemove: (idx: number) => void;
    preview?: HighlightedMediaSearchItem;
    onMove: (idxA: number, idxB: number) => void;
}


const CuratedItemRow = ({ idx, total, item, preview, onMove, onRemove }: CuratedItemRowProps) => {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-2.5">
            <div className="flex w-5 shrink-0 items-center justify-center font-mono text-xs text-muted-foreground">
                #{idx + 1}
            </div>
            {preview?.mediaCover &&
                <img
                    alt=""
                    src={preview.mediaCover}
                    className="h-12 w-8 shrink-0 rounded-md object-cover"
                />
            }
            <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-medium">
                    {preview?.mediaName ?? `Media #${item.mediaId}`}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                    {item.mediaType}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <ButtonGroup aria-label={`Reorder ${preview?.mediaName ?? `media ${item.mediaId}`}`}>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        disabled={idx === 0}
                        aria-label="Move item up"
                        onClick={() => onMove(idx, idx - 1)}
                    >
                        <ArrowUp/>
                    </Button>
                    <Button
                        size="icon-sm"
                        type="button"
                        variant="outline"
                        aria-label="Move item down"
                        disabled={idx === total - 1}
                        onClick={() => onMove(idx, idx + 1)}
                    >
                        <ArrowDown/>
                    </Button>
                </ButtonGroup>
                <Button
                    size="icon-sm"
                    type="button"
                    variant="destructiveGhost"
                    aria-label="Delete item"
                    onClick={() => onRemove(idx)}
                >
                    <Trash2/>
                </Button>
            </div>
        </div>
    );
};
