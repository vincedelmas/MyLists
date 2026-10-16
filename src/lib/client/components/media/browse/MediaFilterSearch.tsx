import {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import type {MediaType} from "@/lib/utils/enums";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {SearchSelect} from "@/lib/client/components/general/SearchSelect";
import {getMediaListSearchFilters} from "@/lib/server/functions/media-lists";
import type {MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";
import {searchMediaFilterOptions} from "@/lib/client/components/media/browse/filter-search";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/AppliedSearchFilterChip";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";


interface MediaFilterSearchProps {
    label: string;
    error?: string;
    value: string[];
    options: string[];
    disabled?: boolean;
    maxSelected?: number;
    onChange: (values: string[]) => void;
    listSearch?: {
        username: string;
        mediaType: MediaType;
        field: MediaMetadataFilterKey;
    };
}


export const MediaFilterSearch = ({ label, options, listSearch, value, onChange, disabled, error, maxSelected }: MediaFilterSearchProps) => {
    const fieldId = useId();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, listSearch ? 400 : 150);
    const atLimit = maxSelected !== undefined && value.length >= maxSelected;

    const { data, isFetching, error: searchError } = useQuery({
        queryKey: ["listFilterSearch", listSearch, debouncedSearch],
        queryFn: () => getMediaListSearchFilters({ data: { ...listSearch!, query: debouncedSearch } }),
        enabled: !!listSearch && !disabled && !atLimit && debouncedSearch.trim().length >= 2,
    });

    const results = listSearch
        ? (data ?? []).map(item => item.name).filter(option => !value.includes(option))
        : searchMediaFilterOptions(options.filter(option => !value.includes(option)), debouncedSearch).slice(0, 8);

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
                aria-describedby={error ? `${fieldId}-error` : atLimit ? `${fieldId}-limit` : undefined}
                emptyMessage={listSearch || options.length ? `No matching ${label.toLowerCase()} here.` : `No ${label.toLowerCase()} available yet.`}
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
