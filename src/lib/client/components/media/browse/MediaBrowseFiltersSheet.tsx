import {useId, useState} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {MediaFiltersSheet} from "@/lib/client/components/media/browse/MediaFiltersSheet";
import {Field, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {MAX_MEDIA_BROWSE_FILTER_VALUES, type MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {MediaFilterCheckbox, MediaFilterCheckboxGroup} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";


type AdvancedFilters = Pick<MediaBrowseFilters, "genres" | "tags" | "favorite" | "minRating">;


interface MediaBrowseFiltersSheetProps {
    open: boolean;
    personal: boolean;
    filters: MediaBrowseFilters;
    onOpenChange: (open: boolean) => void;
    onApply: (filters: AdvancedFilters) => void;
    options: { genres: string[]; tags: string[] };
}


export const MediaBrowseFiltersSheet = ({ open, onOpenChange, filters, options, personal, onApply }: MediaBrowseFiltersSheetProps) => {
    const fieldId = useId();
    const filterGroups: ("genres" | "tags")[] = personal ? ["genres", "tags"] : ["genres"];
    const [draft, setDraft] = useState<AdvancedFilters>(() => ({
        tags: filters.tags,
        genres: filters.genres,
        favorite: filters.favorite,
        minRating: filters.minRating,
    }));

    return (
        <MediaFiltersSheet
            open={open}
            title="Additional filters"
            onOpenChange={onOpenChange}
            description="Narrow the titles shown here. Your saved list and views stay as they are."
            onSubmit={ev => {
                ev.preventDefault();
                onApply(draft);
                onOpenChange(false);
            }}
            footer={<>
                <Button type="submit">Apply filters</Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        onApply({ genres: undefined, tags: undefined, favorite: undefined, minRating: undefined });
                        onOpenChange(false);
                    }}
                >
                    Clear advanced filters
                </Button>
            </>}
        >
            {filterGroups.map(key =>
                <MediaFilterCheckboxGroup
                    key={key}
                    items={options[key]}
                    selected={draft[key] ?? []}
                    title={key === "genres" ? "Genres" : "Tags"}
                    maxSelected={MAX_MEDIA_BROWSE_FILTER_VALUES}
                    onChange={selected => setDraft(current => ({ ...current, [key]: selected.length ? selected : undefined }))}
                />
            )}
            {personal &&
                <FieldSet>
                    <FieldLegend variant="label">
                        List filters
                    </FieldLegend>
                    <FieldGroup>
                        <MediaFilterCheckbox
                            label="Favorites only"
                            checked={draft.favorite ?? false}
                            onChange={checked => setDraft(current => ({ ...current, favorite: checked ? true : undefined }))}
                        />
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-rating`}>
                                Minimum rating
                            </FieldLabel>
                            <Input
                                min={0}
                                max={10}
                                step={0.5}
                                type="number"
                                id={`${fieldId}-rating`}
                                placeholder="Any rating"
                                value={draft.minRating ?? ""}
                                onChange={ev => setDraft(current => ({
                                    ...current,
                                    minRating: ev.target.value === "" ? undefined : Number(ev.target.value),
                                }))}
                            />
                        </Field>
                    </FieldGroup>
                </FieldSet>
            }
        </MediaFiltersSheet>
    );
};
