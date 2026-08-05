import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ApiProviderType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import type {AdvancedSearchFilters, GameAdvancedSearchFilters} from "@/lib/schemas";
import {gameAdvancedSearchOptions} from "@/lib/client/react-query/query-options/search.options";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {AdvancedSearchDialogFrame} from "@/lib/client/components/search/advanced-search/AdvancedSearchDialogFrame";
import type {ProviderAdvancedSearchDialogProps} from "@/lib/client/components/search/advanced-search/advanced-search.types";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {cleanAdvancedSearchText, countAdvancedSearchFilters, toOptionalNumber} from "@/lib/client/components/search/advanced-search/advanced-search.utils";


const createGameFilters = (query: string, applied?: AdvancedSearchFilters): GameAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.IGDB) return applied;

    return {
        provider: ApiProviderType.IGDB,
        title: query?.trim() || undefined,
    };
};


export const GameAdvancedSearchDialog = ({ query, onApply, onClear, advancedFilters, onDialogOpenChange, triggerVariant }: ProviderAdvancedSearchDialogProps) => {
    const [open, setOpen] = useState(false);
    const [formError, setFormError] = useState<string>();
    const [filters, setFilters] = useState(() => createGameFilters(query, advancedFilters));
    const activeCount = advancedFilters?.provider === ApiProviderType.IGDB ? countAdvancedSearchFilters(advancedFilters) : 0;

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setFormError(undefined);
            setFilters(createGameFilters(query, advancedFilters));
        }
        setOpen(nextOpen);
        onDialogOpenChange?.(nextOpen);
    };

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        setFormError(undefined);

        const normalizedFilters = {
            ...filters,
            title: cleanAdvancedSearchText(filters.title),
        };

        if (normalizedFilters.title && normalizedFilters.title.length < 2) {
            setFormError("Game titles must contain at least two characters.");
            return;
        }

        if (normalizedFilters.releaseYearFrom && normalizedFilters.releaseYearTo &&
            normalizedFilters.releaseYearFrom > normalizedFilters.releaseYearTo) {
            setFormError("The first release year must be before the last release year.");
            return;
        }

        if (countAdvancedSearchFilters(normalizedFilters) === 0) {
            setFormError("Add a title or at least one game filter.");
            return;
        }

        onApply(normalizedFilters.title ?? "", normalizedFilters);
        handleOpenChange(false);
    };

    return (
        <AdvancedSearchDialogFrame
            open={open}
            onClear={onClear}
            formError={formError}
            onSubmit={handleSubmit}
            activeCount={activeCount}
            title="Advanced Game Search"
            onOpenChange={handleOpenChange}
            triggerVariant={triggerVariant}
        >
            <GameAdvancedSearchFields
                open={open}
                filters={filters}
                onChange={setFilters}
            />
        </AdvancedSearchDialogFrame>
    );
};


interface GameAdvancedSearchFieldsProps {
    open: boolean;
    filters: GameAdvancedSearchFilters;
    onChange: (filters: GameAdvancedSearchFilters) => void;
}


const GameAdvancedSearchFields = ({ open, filters, onChange }: GameAdvancedSearchFieldsProps) => {
    const { data, isPending, error } = useQuery({ ...gameAdvancedSearchOptions(), enabled: open });

    const platformOptions = [
        { label: isPending ? "Loading platforms…" : "Any platform", value: null },
        ...(data?.platforms.map((option) => ({ label: option.name, value: option.id })) ?? []),
    ];

    const genreOptions = [
        { label: isPending ? "Loading genres…" : "Any genre", value: null },
        ...(data?.genres.map((option) => ({ label: option.name, value: option.id })) ?? []),
    ];

    return (
        <FieldGroup className="grid sm:grid-cols-2">
            <Field className="sm:col-span-2">
                <FieldLabel htmlFor="advanced-game-title">
                    Title
                </FieldLabel>
                <Input
                    autoFocus
                    id="advanced-game-title"
                    value={filters.title ?? ""}
                    placeholder="Disco Elysium"
                    onChange={(ev) => onChange({ ...filters, title: ev.target.value })}
                />
                <FieldDescription>Title is optional when another filter is selected.</FieldDescription>
            </Field>
            <Field data-disabled={isPending || !!error}>
                <FieldLabel htmlFor="advanced-game-platform">
                    Platform
                </FieldLabel>
                <Select
                    items={platformOptions}
                    disabled={isPending || !!error}
                    value={filters.platformId ?? null}
                    onValueChange={(value: number | null) => onChange({ ...filters, platformId: value ?? undefined })}
                >
                    <SelectTrigger id="advanced-game-platform" className="w-full">
                        <SelectValue/>
                    </SelectTrigger>x
                    <SelectContent className="max-h-50 overflow-y-auto scrollbar-thin">
                        <SelectGroup>
                            {platformOptions.map((option) =>
                                <SelectItem key={option.value ?? "any"} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {error &&
                    <FieldDescription>
                        Platforms could not be loaded from IGDB.
                    </FieldDescription>
                }
            </Field>
            <Field data-disabled={isPending || !!error}>
                <FieldLabel htmlFor="advanced-game-genre">
                    Genre
                </FieldLabel>
                <Select
                    items={genreOptions}
                    disabled={isPending || !!error}
                    value={filters.genreId ?? null}
                    onValueChange={(value: number | null) => onChange({ ...filters, genreId: value ?? undefined })}
                >
                    <SelectTrigger id="advanced-game-genre" className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent className="max-h-50 overflow-y-auto scrollbar-thin">
                        <SelectGroup>
                            {genreOptions.map((option) =>
                                <SelectItem key={option.value ?? "any"} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {error &&
                    <FieldDescription>
                        Genres could not be loaded from IGDB.
                    </FieldDescription>
                }
            </Field>
            <Field>
                <FieldLabel htmlFor="advanced-game-year-from">
                    Released from
                </FieldLabel>
                <Input
                    min={1950}
                    max={2200}
                    type="number"
                    placeholder="1990"
                    id="advanced-game-year-from"
                    value={filters.releaseYearFrom ?? ""}
                    onChange={(ev) => onChange({ ...filters, releaseYearFrom: toOptionalNumber(ev.target.value) })}
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="advanced-game-year-to">
                    Released through
                </FieldLabel>
                <Input
                    min={1950}
                    max={2200}
                    type="number"
                    id="advanced-game-year-to"
                    value={filters.releaseYearTo ?? ""}
                    placeholder={new Date().getFullYear().toString()}
                    onChange={(ev) => onChange({ ...filters, releaseYearTo: toOptionalNumber(ev.target.value) })}
                />
            </Field>
            <Field className="sm:col-span-2">
                <FieldLabel htmlFor="advanced-game-rating">
                    Minimum IGDB rating
                </FieldLabel>
                <Input
                    min={0}
                    max={100}
                    type="number"
                    placeholder="75"
                    id="advanced-game-rating"
                    value={filters.minimumRating ?? ""}
                    onChange={(ev) => onChange({ ...filters, minimumRating: toOptionalNumber(ev.target.value) })}
                />
            </Field>
        </FieldGroup>
    );
};
