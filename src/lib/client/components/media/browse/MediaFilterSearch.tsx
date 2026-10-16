import {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import type {MediaType} from "@/lib/utils/enums";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import type {MediaFilterSearchSource} from "@/lib/types/media-list.types";
import {SearchSelect} from "@/lib/client/components/general/SearchSelect";
import type {MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";
import {mediaFilterSearchOptions} from "@/lib/client/react-query/query-options/media.options";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/AppliedSearchFilterChip";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";


interface MediaFilterSearchProps {
    label: string;
    error?: string;
    value: string[];
    disabled?: boolean;
    mediaType: MediaType;
    maxSelected?: number;
    field: MediaMetadataFilterKey;
    source: MediaFilterSearchSource;
    onChange: (values: string[]) => void;
}


export const MediaFilterSearch = ({ label, mediaType, field, source, value, onChange, disabled, error, maxSelected }: MediaFilterSearchProps) => {
    const fieldId = useId();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const atLimit = maxSelected !== undefined && value.length >= maxSelected;

    const { data, isFetching, error: searchError } = useQuery({
        ...mediaFilterSearchOptions(source, mediaType, field, debouncedSearch),
        enabled: !disabled && !atLimit && debouncedSearch.trim().length >= 2,
    });

    const results = (data ?? []).map(item => item.name).filter(option => !value.includes(option));

    return (
        <Field data-invalid={!!error} data-disabled={disabled}>
            <FieldLabel htmlFor={fieldId}>
                {label}
            </FieldLabel>
            <SearchSelect
                id={fieldId}
                items={results}
                search={search}
                error={searchError}
                aria-invalid={!!error}
                onSearchChange={setSearch}
                getItemKey={option => option}
                disabled={disabled || atLimit}
                getItemLabel={option => option}
                placeholder={`Search ${label.toLowerCase()}...`}
                onSelect={option => onChange([...value, option])}
                isPending={isFetching || search !== debouncedSearch}
                emptyMessage={`No matching ${label.toLowerCase()} here.`}
                aria-describedby={error ? `${fieldId}-error` : atLimit ? `${fieldId}-limit` : undefined}
            />

            {atLimit &&
                <FieldDescription id={`${fieldId}-limit`}>
                    Choose up to {maxSelected} values. Remove one to select another.
                </FieldDescription>
            }

            {value.length > 0 &&
                <div className="flex flex-wrap gap-2">
                    {value.map(option =>
                        <AppliedSearchFilterChip
                            key={option}
                            label={option}
                            disabled={disabled}
                            onRemove={() => onChange(value.filter(selected => selected !== option))}
                        />
                    )}
                </div>
            }

            <FieldError id={`${fieldId}-error`}>
                {error}
            </FieldError>
        </Field>
    );
};
