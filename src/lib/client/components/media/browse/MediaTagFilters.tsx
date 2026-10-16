import {useId} from "react";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import type {ScopedMediaFilterValues} from "@/lib/schemas/media-filters.schema";
import {MAX_MEDIA_FILTER_VALUES} from "@/lib/media-definitions/base/media-filters";
import {MediaTagBrowser} from "@/lib/client/components/media/browse/MediaTagBrowser";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";


type TagFilters = Pick<ScopedMediaFilterValues, "tags" | "tagsMatch" | "excludeTags">;


interface MediaTagFiltersProps {
    options: string[];
    disabled?: boolean;
    filters: TagFilters;
    errors?: Record<string, string>;
    onChange: (filters: TagFilters) => void;
}


export const MediaTagFilters = ({ options, filters, disabled, errors, onChange }: MediaTagFiltersProps) => {
    const id = useId();

    return (
        <FieldGroup>
            <MediaTagBrowser
                label="Tags"
                options={options}
                disabled={disabled}
                error={errors?.tags}
                value={filters.tags ?? []}
                maxSelected={MAX_MEDIA_FILTER_VALUES}
                onChange={tags => onChange({ tags: tags.length ? tags : undefined })}
            />

            <Field>
                <FieldLabel id={id}>
                    Tag matching
                </FieldLabel>
                <ToggleGroup
                    variant="outline"
                    disabled={disabled}
                    aria-labelledby={id}
                    value={[filters.tagsMatch ?? "any"]}
                    onValueChange={values => values[0] && onChange({ tagsMatch: values[0] as "any" | "all" })}
                >
                    <ToggleGroupItem value="any">
                        Any included tag
                    </ToggleGroupItem>
                    <ToggleGroupItem value="all">
                        Every included tag
                    </ToggleGroupItem>
                </ToggleGroup>
            </Field>

            <MediaTagBrowser
                options={options}
                label="Exclude tags"
                error={errors?.excludeTags}
                value={filters.excludeTags ?? []}
                maxSelected={MAX_MEDIA_FILTER_VALUES}
                disabled={disabled}
                onChange={excludeTags => onChange({ excludeTags: excludeTags.length ? excludeTags : undefined })}
            />
        </FieldGroup>
    );
};
