import {useQuery} from "@tanstack/react-query";
import {ApiProviderType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {AdvancedSearchFilters, GameAdvancedSearchFilters} from "@/lib/schemas";
import {countAdvancedSearchFilters, toOptionalNumber} from "@/lib/utils/advanced-search.utils";
import {gameAdvancedSearchOptions} from "@/lib/client/react-query/query-options/search.options";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/advanced-search/AppliedSearchFilterChip";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {AdvancedSearchFilterDefinition, AppliedSearchFilterChipsProps, ProviderSearchFilterProps} from "@/lib/types/advanced-search.types";


const createGameFilters = (applied?: AdvancedSearchFilters): GameAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.IGDB) return { ...applied };
    return { provider: ApiProviderType.IGDB };
};


const cleanGameFilters = (filters: AdvancedSearchFilters): GameAdvancedSearchFilters => {
    return createGameFilters(filters);
}


const validateGameFilters = (query: string, filters: AdvancedSearchFilters) => {
    const gameFilters = createGameFilters(filters);
    const trimmedQuery = query.trim();

    if (trimmedQuery && trimmedQuery.length < 2) {
        return "Game titles must contain at least two characters.";
    }

    if (gameFilters.releaseYearFrom && gameFilters.releaseYearTo && gameFilters.releaseYearFrom > gameFilters.releaseYearTo) {
        return "The first release year must be before the last release year.";
    }

    if (!trimmedQuery && countAdvancedSearchFilters(gameFilters) === 0) {
        return "Add a title or at least one game filter.";
    }
};


const GameFilterPanel = ({ filters, onChange }: ProviderSearchFilterProps) => {
    const gameFilters = createGameFilters(filters);
    const { data, isPending, error } = useQuery(gameAdvancedSearchOptions());

    const platformOptions = [
        { label: isPending ? "Loading platforms…" : "Any platform", value: null },
        ...(data?.platforms.map((option) => ({ label: option.name, value: option.id })) ?? []),
    ];

    const genreOptions = [
        { label: isPending ? "Loading genres…" : "Any genre", value: null },
        ...(data?.genres.map((option) => ({ label: option.name, value: option.id })) ?? []),
    ];

    return (
        <FieldGroup className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <Field className="col-span-2 lg:col-span-1" data-disabled={isPending || !!error}>
                <FieldLabel htmlFor="search-game-platform">Platform</FieldLabel>
                <Select
                    items={platformOptions}
                    disabled={isPending || !!error}
                    value={gameFilters.platformId ?? null}
                    onValueChange={(value: number | null) => onChange({ ...gameFilters, platformId: value ?? undefined })}
                >
                    <SelectTrigger id="search-game-platform" className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-72">
                        <SelectGroup>
                            {platformOptions.map((option) =>
                                <SelectItem key={option.value ?? "any"} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {error && <FieldDescription>Platforms could not be loaded from IGDB.</FieldDescription>}
            </Field>

            <Field className="col-span-2 lg:col-span-1" data-disabled={isPending || !!error}>
                <FieldLabel htmlFor="search-game-genre">Genre</FieldLabel>
                <Select
                    items={genreOptions}
                    disabled={isPending || !!error}
                    value={gameFilters.genreId ?? null}
                    onValueChange={(value: number | null) => onChange({ ...gameFilters, genreId: value ?? undefined })}
                >
                    <SelectTrigger id="search-game-genre" className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-72">
                        <SelectGroup>
                            {genreOptions.map((option) =>
                                <SelectItem key={option.value ?? "any"} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {error && <FieldDescription>Genres could not be loaded from IGDB.</FieldDescription>}
            </Field>

            <Field>
                <FieldLabel htmlFor="search-game-year-from">Released from</FieldLabel>
                <Input
                    min={1870}
                    max={2200}
                    type="number"
                    placeholder="1990"
                    id="search-game-year-from"
                    value={gameFilters.releaseYearFrom ?? ""}
                    onChange={(ev) => onChange({ ...gameFilters, releaseYearFrom: toOptionalNumber(ev.target.value) })}
                />
            </Field>

            <Field>
                <FieldLabel htmlFor="search-game-year-to">Released through</FieldLabel>
                <Input
                    min={1870}
                    max={2200}
                    type="number"
                    id="search-game-year-to"
                    value={gameFilters.releaseYearTo ?? ""}
                    placeholder={new Date().getFullYear().toString()}
                    onChange={(ev) => onChange({ ...gameFilters, releaseYearTo: toOptionalNumber(ev.target.value) })}
                />
            </Field>

            <Field className="col-span-2 lg:col-span-1">
                <FieldLabel htmlFor="search-game-rating">Minimum rating</FieldLabel>
                <Input
                    min={0}
                    max={100}
                    type="number"
                    placeholder="75"
                    id="search-game-rating"
                    value={gameFilters.minimumRating ?? ""}
                    onChange={(ev) => onChange({ ...gameFilters, minimumRating: toOptionalNumber(ev.target.value) })}
                />
                <FieldDescription>IGDB score, from 0 to 100.</FieldDescription>
            </Field>
        </FieldGroup>
    );
};


const GameAppliedFilters = ({ filters, onChange }: AppliedSearchFilterChipsProps) => {
    const gameFilters = createGameFilters(filters);
    const { data } = useQuery(gameAdvancedSearchOptions());

    const platformName = data?.platforms.find((option) => option.id === gameFilters.platformId)?.name;
    const genreName = data?.genres.find((option) => option.id === gameFilters.genreId)?.name;

    const chips: Array<{ key: keyof GameAdvancedSearchFilters; label: string }> = [];
    if (gameFilters.genreId) chips.push({ key: "genreId", label: `Genre: ${genreName ?? gameFilters.genreId}` });
    if (gameFilters.releaseYearTo) chips.push({ key: "releaseYearTo", label: `Through ${gameFilters.releaseYearTo}` });
    if (gameFilters.releaseYearFrom) chips.push({ key: "releaseYearFrom", label: `From ${gameFilters.releaseYearFrom}` });
    if (gameFilters.platformId) chips.push({ key: "platformId", label: `Platform: ${platformName ?? gameFilters.platformId}` });
    if (gameFilters.minimumRating !== undefined) chips.push({ key: "minimumRating", label: `Rating ${gameFilters.minimumRating}+` });

    return chips.map((chip) =>
        <AppliedSearchFilterChip
            key={chip.key}
            label={chip.label}
            onRemove={() => onChange({ ...gameFilters, [chip.key]: undefined })}
        />
    );
};


export const gameSearchFilterDefinition: AdvancedSearchFilterDefinition = {
    label: "Game filters",
    FilterPanel: GameFilterPanel,
    validate: validateGameFilters,
    cleanFilters: cleanGameFilters,
    createFilters: createGameFilters,
    AppliedFilters: GameAppliedFilters,
};
