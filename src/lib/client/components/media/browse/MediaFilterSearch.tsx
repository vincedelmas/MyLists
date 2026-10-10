import {useId} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {levenshteinDistance} from "@/lib/utils/levenshtein";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/AppliedSearchFilterChip";


interface MediaFilterSearchProps {
    label: string;
    options: string[];
    value: string[];
    onChange: (values: string[]) => void;
    disabled?: boolean;
    error?: string;
    maxSelected?: number;
}


export const MediaFilterSearch = ({ label, options, value, onChange, disabled, error, maxSelected }: MediaFilterSearchProps) => {
    const fieldId = useId();
    const { search, setSearch, debouncedSearch, isOpen, setIsOpen, reset, containerRef } = useSearchContainer({ debounceMs: 150 });
    const atLimit = maxSelected !== undefined && value.length >= maxSelected;
    const query = debouncedSearch.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const maxDistance = query.length >= 5 ? 2 : 1;
    const results = options.filter(option => !value.includes(option)).map(option => {
        const name = option.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
        if (name.startsWith(query)) return { option, score: 0 };
        if (name.includes(query)) return { option, score: 1 };
        if (query.length < 3) return { option, score: Infinity };

        const distance = Math.min(...[name, ...name.split(/\s+/)].map(word =>
            Math.min(levenshteinDistance(query, word), levenshteinDistance(query, word.slice(0, query.length)))
        ));
        return { option, score: distance <= maxDistance ? 2 + distance : Infinity };
    }).filter(result => Number.isFinite(result.score)).sort((a, b) =>
        a.score - b.score || a.option.localeCompare(b.option)
    ).slice(0, 8);

    const selectOption = (option: string) => {
        onChange([...value, option]);
        reset();
    };

    return (
        <Field data-invalid={!!error} data-disabled={disabled}>
            <FieldLabel htmlFor={fieldId}>
                {label}
            </FieldLabel>
            <div ref={containerRef} className="relative">
                <SearchInput
                    id={fieldId}
                    value={search}
                    disabled={disabled || atLimit}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : atLimit ? `${fieldId}-limit` : undefined}
                    aria-expanded={isOpen && query.length >= 2 && !disabled && !atLimit}
                    aria-controls={`${fieldId}-results`}
                    aria-autocomplete="list"
                    placeholder={`Search ${label.toLowerCase()}...`}
                    onFocus={() => search && setIsOpen(true)}
                    onChange={event => setSearch(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === "Escape") reset();
                        if (event.key === "Enter") {
                            event.preventDefault();
                            if (isOpen && query.length >= 2 && results.length && search.trim() === debouncedSearch.trim()) {
                                selectOption(results[0].option);
                            }
                        }
                    }}
                />
                <SearchContainer
                    search={search}
                    isOpen={isOpen && !disabled && !atLimit}
                    isPending={false}
                    debouncedSearch={debouncedSearch}
                    hasResults={results.length > 0}
                    emptyMessage={options.length ? `No matching ${label.toLowerCase()} here.` : `No ${label.toLowerCase()} available yet.`}
                >
                    <div id={`${fieldId}-results`} className="flex max-h-64 flex-col gap-1 overflow-y-auto p-1">
                        {results.map(({ option }) =>
                            <Button
                                key={option}
                                type="button"
                                variant="ghost"
                                className="justify-start"
                                onClick={() => selectOption(option)}
                            >
                                <span className="truncate">{option}</span>
                            </Button>
                        )}
                    </div>
                </SearchContainer>
            </div>
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
            <FieldError id={`${fieldId}-error`}>{error}</FieldError>
        </Field>
    );
};
