import React, {useState} from "react";
import {Search, SlidersHorizontal} from "lucide-react";
import {Input} from "@/lib/client/components/ui/input";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {AdvancedSearchFilters, BookAdvancedSearchFilters, GameAdvancedSearchFilters, TmdbAdvancedSearchFilters} from "@/lib/schemas";
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


type AdvancedProvider = typeof ApiProviderType.BOOKS | typeof ApiProviderType.IGDB | typeof ApiProviderType.TMDB;


interface AdvancedSearchDialogProps {
    query: string;
    onClear: () => void;
    provider: ApiProviderType;
    triggerVariant?: "compact" | "default";
    advancedFilters?: AdvancedSearchFilters;
    onDialogOpenChange?: (open: boolean) => void;
    onApply: (query: string, advancedFilters: AdvancedSearchFilters) => void;
}


const languageOptions = [
    { label: "Any language", value: null },
    { label: "English", value: "en" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Spanish", value: "es" },
    { label: "Italian", value: "it" },
    { label: "Japanese", value: "ja" },
];


const printTypeOptions = [
    { label: "Books only", value: "books" },
    { label: "Books and magazines", value: null },
    { label: "Magazines only", value: "magazines" },
];


const availabilityOptions = [
    { label: "Any eBook", value: "ebooks" },
    { label: "Any availability", value: null },
    { label: "Free eBooks", value: "free-ebooks" },
    { label: "Paid eBooks", value: "paid-ebooks" },
    { label: "Full text available", value: "full" },
    { label: "Preview available", value: "partial" },
];


const bookSortOptions = [
    { label: "Most relevant", value: null },
    { label: "Newest first", value: "newest" },
];


const gamePlatformOptions = [
    { label: "PC", value: 6 },
    { label: "iOS", value: 39 },
    { label: "Android", value: 34 },
    { label: "Xbox One", value: 49 },
    { label: "PlayStation 4", value: 48 },
    { label: "Any platform", value: null },
    { label: "PlayStation 5", value: 167 },
    { label: "Nintendo Switch", value: 130 },
    { label: "Xbox Series X|S", value: 169 },
];


const gameGenreOptions = [
    { label: "Puzzle", value: 9 },
    { label: "Indie", value: 32 },
    { label: "Sport", value: 14 },
    { label: "Arcade", value: 33 },
    { label: "Racing", value: 10 },
    { label: "Shooter", value: 5 },
    { label: "Platform", value: 8 },
    { label: "Fighting", value: 4 },
    { label: "Strategy", value: 15 },
    { label: "Simulator", value: 13 },
    { label: "Adventure", value: 31 },
    { label: "Any genre", value: null },
    { label: "Visual novel", value: 34 },
    { label: "Role-playing (RPG)", value: 12 },
];


const isAdvancedProvider = (provider: ApiProviderType): provider is AdvancedProvider => {
    return provider === ApiProviderType.BOOKS || provider === ApiProviderType.IGDB || provider === ApiProviderType.TMDB;
};


const cleanText = (value?: string) => value?.trim() || undefined;


const toOptionalNumber = (value: string) => value === "" ? undefined : Number(value);


const createBookFilters = (query: string, applied?: AdvancedSearchFilters): BookAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.BOOKS) return applied;
    return { provider: ApiProviderType.BOOKS, title: cleanText(query) };
};


const createGameFilters = (query: string, applied?: AdvancedSearchFilters): GameAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.IGDB) return applied;
    return { provider: ApiProviderType.IGDB, title: cleanText(query) };
};


const createTmdbFilters = (query: string, applied?: AdvancedSearchFilters): TmdbAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.TMDB) return applied;
    return {
        provider: ApiProviderType.TMDB,
        mediaType: MediaType.MOVIES,
        title: cleanText(query),
    };
};


export const countAdvancedSearchFilters = (filters?: AdvancedSearchFilters) => {
    if (!filters) return 0;

    return Object.entries(filters).filter(([key, value]) => {
        if (key === "provider") return false;
        if (filters.provider === ApiProviderType.TMDB && key === "mediaType") return true;
        return value !== undefined && value !== null && value !== "";
    }).length;
};


export const getAdvancedSearchLabel = (filters: AdvancedSearchFilters) => {
    if (filters.provider === ApiProviderType.BOOKS) {
        return filters.title ?? filters.author ?? filters.isbn ?? filters.publisher ?? filters.subject ?? "Advanced book search";
    }
    if (filters.provider === ApiProviderType.IGDB) {
        return filters.title ?? "Advanced game search";
    }

    return filters.title ?? `Discover ${filters.mediaType}`;
};


export const AdvancedSearchDialog = ({ query, provider, advancedFilters, onApply, onClear, onDialogOpenChange, triggerVariant = "default" }: AdvancedSearchDialogProps) => {
    const [open, setOpen] = useState(false);
    const [formError, setFormError] = useState<string>();
    const [isbnError, setIsbnError] = useState<string>();
    const [bookFilters, setBookFilters] = useState(() => createBookFilters(query, advancedFilters));
    const [gameFilters, setGameFilters] = useState(() => createGameFilters(query, advancedFilters));
    const [tmdbFilters, setTmdbFilters] = useState(() => createTmdbFilters(query, advancedFilters));

    if (!isAdvancedProvider(provider)) return null;

    const activeCount = advancedFilters?.provider === provider
        ? countAdvancedSearchFilters(advancedFilters)
        : 0;

    const resetDraft = () => {
        setFormError(undefined);
        setIsbnError(undefined);
        setBookFilters(createBookFilters(query, advancedFilters));
        setGameFilters(createGameFilters(query, advancedFilters));
        setTmdbFilters(createTmdbFilters(query, advancedFilters));
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) resetDraft();
        setOpen(nextOpen);
        onDialogOpenChange?.(nextOpen);
    };

    const handleClear = () => {
        onClear();
        setOpen(false);
        onDialogOpenChange?.(false);
    };

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        setFormError(undefined);
        setIsbnError(undefined);

        if (provider === ApiProviderType.BOOKS) {
            const normalizedFilters = {
                ...bookFilters,
                isbn: cleanText(bookFilters.isbn),
                title: cleanText(bookFilters.title),
                author: cleanText(bookFilters.author),
                subject: cleanText(bookFilters.subject),
                publisher: cleanText(bookFilters.publisher),
            };

            const normalizedIsbn = normalizedFilters.isbn?.replace(/[\s-]/g, "");

            if (normalizedIsbn && !/^(?:\d{9}[\dX]|\d{13})$/i.test(normalizedIsbn)) {
                setIsbnError("Enter a valid ISBN-10 or ISBN-13.");
                return;
            }

            if (![normalizedFilters.title, normalizedFilters.author, normalizedFilters.isbn, normalizedFilters.publisher, normalizedFilters.subject].some(Boolean)) {
                setFormError("Add a title, author, ISBN, publisher, or subject to search books.");
                return;
            }

            onApply(normalizedFilters.title ?? "", normalizedFilters);
        }
        else if (provider === ApiProviderType.IGDB) {
            const normalizedFilters = { ...gameFilters, title: cleanText(gameFilters.title) };

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
        }
        else {
            const normalizedFilters = { ...tmdbFilters, title: cleanText(tmdbFilters.title) };

            if (normalizedFilters.title && normalizedFilters.title.length < 2) {
                setFormError("Media titles must contain at least two characters.");
                return;
            }

            onApply(normalizedFilters.title ?? "", normalizedFilters);
        }

        setOpen(false);
        onDialogOpenChange?.(false);
    };

    const title = provider === ApiProviderType.BOOKS
        ? "Advanced book search"
        : provider === ApiProviderType.IGDB
            ? "Advanced game search"
            : "Advanced media search";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        size={triggerVariant === "compact" ? "icon-sm" : "default"}
                        className={triggerVariant === "compact" ? "relative" : undefined}
                        aria-label={`${title}${activeCount > 0 ? `, ${activeCount} active filters` : ""}`}
                        variant={activeCount > 0 ? "secondary" : triggerVariant === "compact" ? "ghost" : "outline"}
                    />
                }
            >
                <SlidersHorizontal data-icon="inline-start"/>
                {triggerVariant === "default" && "Advanced"}
                {activeCount > 0 &&
                    <Badge
                        variant={triggerVariant === "compact" ? "default" : "outline"}
                        className={triggerVariant === "compact" ? "absolute -top-1.5 -right-1.5 size-4 px-0" : "ml-0.5"}
                    >
                        {activeCount}
                    </Badge>
                }
            </DialogTrigger>

            <DialogContent
                onClick={(ev) => ev.stopPropagation()}
                className="max-h-[calc(100dvh-1rem)] overflow-hidden sm:max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Build the full query here. Nothing is requested until you press Search.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4 overflow-hidden">
                    <div className="max-h-[52dvh] overflow-y-auto px-0.5 py-1 sm:max-h-[65vh]">
                        {provider === ApiProviderType.BOOKS &&
                            <BookFields
                                filters={bookFilters}
                                isbnError={isbnError}
                                onChange={setBookFilters}
                            />
                        }
                        {provider === ApiProviderType.IGDB &&
                            <GameFields filters={gameFilters} onChange={setGameFilters}/>
                        }
                        {provider === ApiProviderType.TMDB &&
                            <TmdbFields filters={tmdbFilters} onChange={setTmdbFilters}/>
                        }
                    </div>

                    {formError && <FieldError>{formError}</FieldError>}

                    <DialogFooter className="flex-row justify-end">
                        {activeCount > 0 &&
                            <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                                Clear filters
                            </Button>
                        }
                        <DialogClose render={<Button type="button" size="sm" variant="outline"/>}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" size="sm">
                            <Search data-icon="inline-start"/>
                            Search
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


interface BookFieldsProps {
    isbnError?: string;
    filters: BookAdvancedSearchFilters;
    onChange: (filters: BookAdvancedSearchFilters) => void;
}


const BookFields = ({ filters, isbnError, onChange }: BookFieldsProps) => (
    <FieldGroup className="grid grid-cols-2 gap-3 sm:gap-5">
        <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="advanced-book-title">Title</FieldLabel>
            <Input
                id="advanced-book-title"
                autoFocus
                value={filters.title ?? ""}
                placeholder="The Left Hand of Darkness"
                onChange={(ev) => onChange({ ...filters, title: ev.target.value })}
            />
        </Field>
        <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="advanced-book-author">Author</FieldLabel>
            <Input
                id="advanced-book-author"
                value={filters.author ?? ""}
                placeholder="Ursula K. Le Guin"
                onChange={(ev) => onChange({ ...filters, author: ev.target.value })}
            />
        </Field>
        <Field className="col-span-2 sm:col-span-1" data-invalid={!!isbnError}>
            <FieldLabel htmlFor="advanced-book-isbn">ISBN</FieldLabel>
            <Input
                id="advanced-book-isbn"
                value={filters.isbn ?? ""}
                placeholder="978-0-441-47812-5"
                aria-invalid={!!isbnError}
                onChange={(ev) => onChange({ ...filters, isbn: ev.target.value })}
            />
            <FieldDescription>ISBN-10 or ISBN-13.</FieldDescription>
            <FieldError>{isbnError}</FieldError>
        </Field>
        <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="advanced-book-publisher">Publisher</FieldLabel>
            <Input
                id="advanced-book-publisher"
                value={filters.publisher ?? ""}
                placeholder="Ace Books"
                onChange={(ev) => onChange({ ...filters, publisher: ev.target.value })}
            />
        </Field>
        <Field className="col-span-2">
            <FieldLabel htmlFor="advanced-book-subject">Subject</FieldLabel>
            <Input
                id="advanced-book-subject"
                value={filters.subject ?? ""}
                placeholder="Science fiction"
                onChange={(ev) => onChange({ ...filters, subject: ev.target.value })}
            />
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-book-language">Language</FieldLabel>
            <Select
                items={languageOptions}
                value={filters.language ?? null}
                onValueChange={(value: string | null) => onChange({
                    ...filters,
                    language: value as BookAdvancedSearchFilters["language"],
                })}
            >
                <SelectTrigger id="advanced-book-language" className="w-full"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>{languageOptions.map((option) =>
                    <SelectItem key={option.value ?? "any"} value={option.value}>{option.label}</SelectItem>
                )}</SelectGroup></SelectContent>
            </Select>
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-book-print-type">Publication type</FieldLabel>
            <Select
                items={printTypeOptions}
                value={filters.printType ?? null}
                onValueChange={(value: string | null) => onChange({
                    ...filters,
                    printType: value as BookAdvancedSearchFilters["printType"],
                })}
            >
                <SelectTrigger id="advanced-book-print-type" className="w-full"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>{printTypeOptions.map((option) =>
                    <SelectItem key={option.value ?? "any"} value={option.value}>{option.label}</SelectItem>
                )}</SelectGroup></SelectContent>
            </Select>
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-book-availability">Availability</FieldLabel>
            <Select
                items={availabilityOptions}
                value={filters.availability ?? null}
                onValueChange={(value: string | null) => onChange({
                    ...filters,
                    availability: value as BookAdvancedSearchFilters["availability"],
                })}
            >
                <SelectTrigger id="advanced-book-availability" className="w-full"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>{availabilityOptions.map((option) =>
                    <SelectItem key={option.value ?? "any"} value={option.value}>{option.label}</SelectItem>
                )}</SelectGroup></SelectContent>
            </Select>
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-book-order">Order</FieldLabel>
            <Select
                items={bookSortOptions}
                value={filters.orderBy ?? null}
                onValueChange={(value: string | null) => onChange({
                    ...filters,
                    orderBy: value as BookAdvancedSearchFilters["orderBy"],
                })}
            >
                <SelectTrigger id="advanced-book-order" className="w-full"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>{bookSortOptions.map((option) =>
                    <SelectItem key={option.value ?? "relevance"} value={option.value}>{option.label}</SelectItem>
                )}</SelectGroup></SelectContent>
            </Select>
        </Field>
    </FieldGroup>
);


interface GameFieldsProps {
    filters: GameAdvancedSearchFilters;
    onChange: (filters: GameAdvancedSearchFilters) => void;
}


const GameFields = ({ filters, onChange }: GameFieldsProps) => (
    <FieldGroup className="grid sm:grid-cols-2">
        <Field className="sm:col-span-2">
            <FieldLabel htmlFor="advanced-game-title">Title</FieldLabel>
            <Input
                id="advanced-game-title"
                autoFocus
                value={filters.title ?? ""}
                placeholder="Disco Elysium"
                onChange={(ev) => onChange({ ...filters, title: ev.target.value })}
            />
            <FieldDescription>Title is optional when another filter is selected.</FieldDescription>
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-game-platform">Platform</FieldLabel>
            <Select
                items={gamePlatformOptions}
                value={filters.platformId ?? null}
                onValueChange={(value: number | null) => onChange({ ...filters, platformId: value ?? undefined })}
            >
                <SelectTrigger id="advanced-game-platform" className="w-full"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>{gamePlatformOptions.map((option) =>
                    <SelectItem key={option.value ?? "any"} value={option.value}>{option.label}</SelectItem>
                )}</SelectGroup></SelectContent>
            </Select>
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-game-genre">Genre</FieldLabel>
            <Select
                items={gameGenreOptions}
                value={filters.genreId ?? null}
                onValueChange={(value: number | null) => onChange({ ...filters, genreId: value ?? undefined })}
            >
                <SelectTrigger id="advanced-game-genre" className="w-full"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>{gameGenreOptions.map((option) =>
                    <SelectItem key={option.value ?? "any"} value={option.value}>{option.label}</SelectItem>
                )}</SelectGroup></SelectContent>
            </Select>
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-game-year-from">Released from</FieldLabel>
            <Input
                id="advanced-game-year-from"
                type="number"
                min={1950}
                max={2200}
                value={filters.releaseYearFrom ?? ""}
                placeholder="1990"
                onChange={(ev) => onChange({ ...filters, releaseYearFrom: toOptionalNumber(ev.target.value) })}
            />
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-game-year-to">Released through</FieldLabel>
            <Input
                id="advanced-game-year-to"
                type="number"
                min={1950}
                max={2200}
                value={filters.releaseYearTo ?? ""}
                placeholder={new Date().getFullYear().toString()}
                onChange={(ev) => onChange({ ...filters, releaseYearTo: toOptionalNumber(ev.target.value) })}
            />
        </Field>
        <Field className="sm:col-span-2">
            <FieldLabel htmlFor="advanced-game-rating">Minimum IGDB rating</FieldLabel>
            <Input
                id="advanced-game-rating"
                type="number"
                min={0}
                max={100}
                value={filters.minimumRating ?? ""}
                placeholder="75"
                onChange={(ev) => onChange({ ...filters, minimumRating: toOptionalNumber(ev.target.value) })}
            />
        </Field>
    </FieldGroup>
);


interface TmdbFieldsProps {
    filters: TmdbAdvancedSearchFilters;
    onChange: (filters: TmdbAdvancedSearchFilters) => void;
}


const TmdbFields = ({ filters, onChange }: TmdbFieldsProps) => (
    <FieldGroup>
        <FieldSet>
            <FieldLegend variant="label">Media type</FieldLegend>
            <FieldDescription>Choose one type so results and release dates stay precise.</FieldDescription>
            <ToggleGroup
                value={[filters.mediaType]}
                onValueChange={(values) => {
                    const mediaType = values[0] as TmdbAdvancedSearchFilters["mediaType"] | undefined;
                    if (mediaType) onChange({ ...filters, mediaType });
                }}
                variant="outline"
                className="grid w-full grid-cols-3"
            >
                <ToggleGroupItem value={MediaType.MOVIES} className="w-full">Movies</ToggleGroupItem>
                <ToggleGroupItem value={MediaType.SERIES} className="w-full">Series</ToggleGroupItem>
                <ToggleGroupItem value={MediaType.ANIME} className="w-full">Anime</ToggleGroupItem>
            </ToggleGroup>
        </FieldSet>
        <FieldGroup className="grid sm:grid-cols-2">
            <Field>
                <FieldLabel htmlFor="advanced-media-title">Title</FieldLabel>
                <Input
                    id="advanced-media-title"
                    autoFocus
                    value={filters.title ?? ""}
                    placeholder="Optional title"
                    onChange={(ev) => onChange({ ...filters, title: ev.target.value })}
                />
                <FieldDescription>Leave blank to discover titles by type and year.</FieldDescription>
            </Field>
            <Field>
                <FieldLabel htmlFor="advanced-media-year">
                    {filters.mediaType === MediaType.MOVIES ? "Release year" : "First air year"}
                </FieldLabel>
                <Input
                    id="advanced-media-year"
                    type="number"
                    min={1870}
                    max={2200}
                    value={filters.year ?? ""}
                    placeholder={new Date().getFullYear().toString()}
                    onChange={(ev) => onChange({ ...filters, year: toOptionalNumber(ev.target.value) })}
                />
            </Field>
        </FieldGroup>
    </FieldGroup>
);
