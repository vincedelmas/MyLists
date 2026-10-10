import type {MediaType} from "@/lib/utils/enums";
import type {MediaMetadataFilterOptions} from "@/lib/types/media-list.types";
import type {MediaMetadataFilters} from "@/lib/media-definitions/definition.registry";
import {getMediaFilterDefinitions} from "@/lib/client/components/media/browse/media-filter.utils";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {MediaFilterSearch} from "@/lib/client/components/media/browse/MediaFilterSearch";
import {MediaFilterCheckboxGroup} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";


interface MediaSpecificFiltersProps {
    mediaType: MediaType;
    options: MediaMetadataFilterOptions;
    filters: MediaMetadataFilters;
    maxSelected?: number;
    disabled?: boolean;
    errors?: Record<string, string>;
    onChange: (filters: Partial<MediaMetadataFilters>) => void;
}


export const MediaSpecificFilters = ({ mediaType, options, filters, maxSelected, disabled, errors, onChange }: MediaSpecificFiltersProps) => (
    <FieldGroup>
        {getMediaFilterDefinitions(mediaType).map(filter => {
            const values = filters[filter.key] ?? [];
            const update = (selected: string[]) => onChange({ [filter.key]: selected.length ? selected : undefined });

            if (filter.type === "search") {
                return (
                    <MediaFilterSearch
                        key={filter.key}
                        label={filter.title}
                        options={options[filter.key]?.map(item => item.name) ?? []}
                        value={values}
                        onChange={update}
                        disabled={disabled}
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
                    title={filter.title}
                    items={[...new Set([...(items?.map(item => item.name) ?? []), ...values])]}
                    selected={values}
                    onChange={update}
                    maxSelected={maxSelected}
                    disabled={disabled}
                    error={errors?.[filter.key]}
                    renderLabel={filter.render}
                />
            );
        })}
    </FieldGroup>
);
