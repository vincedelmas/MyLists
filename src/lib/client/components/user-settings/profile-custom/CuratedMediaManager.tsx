import {useQuery} from "@tanstack/react-query";
import {Dispatch, SetStateAction} from "react";
import {toItemKey} from "@/lib/utils/media-mapping";
import {Label} from "@/lib/client/components/ui/label";
import {Input} from "@/lib/client/components/ui/input";
import {ArrowDown, ArrowUp, Trash2} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useFieldArray, useFormContext} from "react-hook-form";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {profileCustomSearchOptions} from "@/lib/client/react-query/query-options";
import {HighlightedMediaRef, HighlightedMediaSearchItem, HighlightedMediaSettings, HighlightedMediaTab, PROFILE_MAX_HIGHLIGHTED_MEDIA} from "@/lib/types/profile-custom.types";


interface CuratedMediaManagerProps {
    activeTab: HighlightedMediaTab;
    setRootError: (error: string | null) => void;
    previewCache: Record<string, HighlightedMediaSearchItem>;
    setPreviewCache: Dispatch<SetStateAction<Record<string, HighlightedMediaSearchItem>>>;
}


export const CuratedMediaManager = ({ activeTab, previewCache, setPreviewCache, setRootError }: CuratedMediaManagerProps) => {
    const { control } = useFormContext<HighlightedMediaSettings>();
    const { fields, append, remove, swap } = useFieldArray({ control, name: `${activeTab}.items` });
    const { containerRef, search, setSearch, isOpen, debouncedSearch, reset } = useSearchContainer({
        onReset: () => setRootError(null),
    });
    
    const selectedKeys = new Set(fields.map((f) => toItemKey(f)));
    const { data: searchResults, isFetching, error } = useQuery(profileCustomSearchOptions(activeTab, debouncedSearch));

    const handleAddItem = (item: HighlightedMediaSearchItem) => {
        if (selectedKeys.has(toItemKey(item)) || fields.length >= PROFILE_MAX_HIGHLIGHTED_MEDIA) return;

        setPreviewCache((prev) => ({ ...prev, [toItemKey(item)]: item }));
        append({ mediaId: item.mediaId, mediaType: item.mediaType });
        reset();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="highlighted-media-search">
                    Add Media
                </Label>
                <div ref={containerRef} className="relative">
                    <Input
                        value={search}
                        inputMode="search"
                        className="text-xs"
                        id="highlighted-media-search"
                        onChange={(ev) => setSearch(ev.target.value)}
                        placeholder={activeTab === "overview"
                            ? "Search in your lists..."
                            : `Search in your ${activeTab} list...`
                        }
                    />
                    <SearchContainer
                        error={error}
                        search={search}
                        isOpen={isOpen}
                        isPending={isFetching}
                        debouncedSearch={debouncedSearch}
                        hasResults={!!searchResults?.length}
                        emptyMessage="No Matching Media Found in Your List."
                    >
                        <div className="max-h-80 divide-y overflow-y-auto">
                            {searchResults?.map((item) => {
                                const isSelected = selectedKeys.has(toItemKey(item));
                                const isAtLimit = fields.length >= PROFILE_MAX_HIGHLIGHTED_MEDIA;

                                return (
                                    <button
                                        type="button"
                                        key={toItemKey(item)}
                                        disabled={isSelected || isAtLimit}
                                        onClick={() => handleAddItem(item)}
                                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40 disabled:opacity-50"
                                    >
                                        <img
                                            alt={item.mediaName}
                                            src={item.mediaCover}
                                            className="h-14 w-10 rounded object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="line-clamp-1 font-medium">
                                                {item.mediaName}
                                            </div>
                                            <div className="text-xs text-muted-foreground capitalize">
                                                {item.mediaType}
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {isSelected ? "Added" : isAtLimit && "Limit reached"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </SearchContainer>
                </div>
                <p className="text-xs text-muted-foreground">
                    Search only uses your list data. Overview can mix media types.
                </p>
            </div>

            <div className="space-y-3">
                <div>
                    <Label>Curated Items</Label>
                    <p className="text-xs text-muted-foreground">
                        Up to {PROFILE_MAX_HIGHLIGHTED_MEDIA} items. Use arrows to control order.
                    </p>
                </div>

                {fields.length === 0 ?
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No Media Selected Yet.
                    </div>
                    :
                    <div className="space-y-2">
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
            </div>
        </div>
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
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-center text-muted-foreground">
                #{idx + 1}
            </div>
            <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-medium">
                    {preview?.mediaName ?? `Media #${item.mediaId}`}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                    {item.mediaType}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={idx === 0}
                    aria-label="Move item up"
                    onClick={() => onMove(idx, idx - 1)}
                >
                    <ArrowUp size={16}/>
                </Button>
                <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    aria-label="Move item down"
                    disabled={idx === total - 1}
                    onClick={() => onMove(idx, idx + 1)}
                >
                    <ArrowDown size={16}/>
                </Button>
                <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    aria-label="Delete item"
                    onClick={() => onRemove(idx)}
                >
                    <Trash2 size={16}/>
                </Button>
            </div>
        </div>
    );
};
