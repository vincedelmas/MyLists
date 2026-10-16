import {Plus} from "lucide-react";
import {useId, useState, type ReactNode} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {MediaTagChoice} from "@/lib/client/components/media/browse/MediaTagChoice";
import {searchMediaFilterOptions} from "@/lib/client/components/media/browse/filter-search";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/AppliedSearchFilterChip";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";


interface MediaTagBrowserProps {
    label: string;
    error?: string;
    value: string[];
    options: string[];
    disabled?: boolean;
    maxSelected?: number;
    onChange: (values: string[]) => void;
    onCreate?: (name: string) => Promise<void>;
    renderChoice?: (name: string, selected: boolean, onSelect: () => void) => ReactNode;
}


export const MediaTagBrowser = ({ label, options, value, onChange, disabled, error, maxSelected, onCreate, renderChoice }: MediaTagBrowserProps) => {
    const id = useId();
    const [search, setSearch] = useState("");
    const results = searchMediaFilterOptions(options, search);
    const atLimit = maxSelected !== undefined && value.length >= maxSelected;
    const canCreate = onCreate && search.trim() && !options.some(name => name.toLowerCase() === search.trim().toLowerCase());

    const create = async () => {
        if (!canCreate || disabled) return;
        try {
            await onCreate(search.trim());
            setSearch("");
        }
        catch {
            // Keep the entered name available; the mutation displays its error.
        }
    };

    return (
        <Field data-invalid={!!error} data-disabled={disabled}>
            <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={id}>
                    {label}
                </FieldLabel>
                <FieldDescription>
                    {options.length} available · {value.length} selected
                </FieldDescription>
            </div>
            {value.length > 0 &&
                <div className="flex flex-col gap-2 border-l-2 border-brand/40 pl-3" role="group" aria-label={`Selected ${label.toLowerCase()}`}>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                            Selected
                        </span>
                        <Button type="button" size="xs" variant="ghost" disabled={disabled} onClick={() => onChange([])}>
                            Clear selected {label.toLowerCase()}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {value.map(name =>
                            <AppliedSearchFilterChip
                                key={name}
                                label={name}
                                disabled={disabled}
                                onRemove={() => onChange(value.filter(item => item !== name))}
                            />
                        )}
                    </div>
                </div>
            }

            <SearchInput
                id={id}
                value={search}
                disabled={disabled}
                aria-invalid={!!error}
                onChange={ev => setSearch(ev.target.value)}
                aria-describedby={error ? `${id}-error` : undefined}
                placeholder={onCreate ? "Find or create a tag..." : "Find a tag..."}
                onKeyDown={ev => {
                    if (ev.key === "Escape" && search) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setSearch("");
                    }
                    if (ev.key === "Enter" && !ev.nativeEvent.isComposing) {
                        ev.preventDefault();
                        if (canCreate) void create();
                    }
                }}
            />

            {canCreate &&
                <Button type="button" variant="outline" size="sm" className="w-fit max-w-full" disabled={disabled} onClick={() => void create()}>
                    <Plus data-icon="inline-start"/>
                    <span>Create tag</span>
                    <span aria-hidden="true" className="truncate">
                        "{search.trim()}"
                    </span>
                </Button>
            }

            {results.length > 0 ?
                <div className="max-h-65 overflow-y-auto scrollbar-thin overscroll-contain pr-1" role="region" aria-label={`${label} directory`}>
                    <div className="flex flex-col gap-0.5">
                        {results.map(name => {
                            const selected = value.includes(name);
                            const toggle = () => onChange(selected ? value.filter(item => item !== name) : [...value, name]);
                            return renderChoice ?
                                <div key={name} className="min-w-0">{renderChoice(name, selected, toggle)}</div>
                                : <MediaTagChoice
                                    key={name}
                                    label={name}
                                    selected={selected}
                                    ariaLabel={selected ? `Deselect ${label.toLowerCase()}: ${name}` : `Select ${label.toLowerCase()}: ${name}`}
                                    disabled={disabled || (atLimit && !selected)}
                                    onSelect={toggle}
                                />;
                        })}
                    </div>
                </div>
                : <FieldDescription>{search ? "No matching tags." : "No tags created yet."}</FieldDescription>
            }
            {atLimit && <FieldDescription>Choose up to {maxSelected} tags. Remove one to select another.</FieldDescription>}
            <FieldError id={`${id}-error`}>{error}</FieldError>
        </Field>
    );
};
