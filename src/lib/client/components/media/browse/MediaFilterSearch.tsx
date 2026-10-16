import {useId, useState} from "react";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {SearchSelect} from "@/lib/client/components/general/SearchSelect";
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
}


export const MediaFilterSearch = ({ label, options, value, onChange, disabled, error, maxSelected }: MediaFilterSearchProps) => {
    const fieldId = useId();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 150);
    const atLimit = maxSelected !== undefined && value.length >= maxSelected;
    const results = searchMediaFilterOptions(options.filter(option => !value.includes(option)), debouncedSearch).slice(0, 8);

    return (
        <Field data-invalid={!!error} data-disabled={disabled}>
            <FieldLabel htmlFor={fieldId}>
                {label}
            </FieldLabel>
            <SearchSelect
                id={fieldId}
                items={results}
                search={search}
                aria-invalid={!!error}
                onSearchChange={setSearch}
                getItemKey={option => option}
                disabled={disabled || atLimit}
                getItemLabel={option => option}
                isPending={search !== debouncedSearch}
                placeholder={`Search ${label.toLowerCase()}...`}
                onSelect={option => onChange([...value, option])}
                aria-describedby={error ? `${fieldId}-error` : atLimit ? `${fieldId}-limit` : undefined}
                emptyMessage={options.length ? `No matching ${label.toLowerCase()} here.` : `No ${label.toLowerCase()} available yet.`}
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
