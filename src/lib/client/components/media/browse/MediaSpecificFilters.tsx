import type {MediaType} from "@/lib/utils/enums";
import {FieldGroup} from "@/lib/client/components/ui/field";
import type {MediaMetadataFilters} from "@/lib/media-definitions/definition.registry";
import {MediaFilterSearch} from "@/lib/client/components/media/browse/MediaFilterSearch";
import {getMediaFilterDefinitions} from "@/lib/client/components/media/browse/media-filter.utils";
import type {MediaFilterSearchSource, MediaMetadataFilterOptions} from "@/lib/types/media-list.types";
import {MediaFilterCheckboxGroup} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";


interface MediaSpecificFiltersProps {
    disabled?: boolean;
    mediaType: MediaType;
    maxSelected?: number;
    filters: MediaMetadataFilters;
    errors?: Record<string, string>;
    options: MediaMetadataFilterOptions;
    searchSource: MediaFilterSearchSource;
    onChange: (filters: Partial<MediaMetadataFilters>) => void;
}


export const MediaSpecificFilters = ({ mediaType, searchSource, options, filters, maxSelected, disabled, errors, onChange }: MediaSpecificFiltersProps) => (
    <FieldGroup>
        {getMediaFilterDefinitions(mediaType).map(filter => {
            const values = filters[filter.key] ?? [];
            const update = (selected: string[]) => onChange({ [filter.key]: selected.length ? selected : undefined });

            if (filter.type === "search") {
                return (
                    <MediaFilterSearch
                        value={values}
                        key={filter.key}
                        onChange={update}
                        field={filter.key}
                        disabled={disabled}
                        label={filter.title}
                        source={searchSource}
                        mediaType={mediaType}
                        maxSelected={maxSelected}
                        error={errors?.[filter.key]}
                    />
                );
            }

            const items = options[filter.key];
            if (!items?.length && !values.length) return null;

            return (
                <MediaFilterCheckboxGroup
                    key={filter.key}
                    selected={values}
                    onChange={update}
                    disabled={disabled}
                    title={filter.title}
                    maxSelected={maxSelected}
                    renderLabel={filter.render}
                    error={errors?.[filter.key]}
                    items={[...new Set([...(items?.map(item => item.name) ?? []), ...values])]}
                />
            );
        })}
    </FieldGroup>
);
