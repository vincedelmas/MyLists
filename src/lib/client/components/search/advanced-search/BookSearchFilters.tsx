import {ApiProviderType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {cleanAdvancedSearchText} from "@/lib/utils/advanced-search.utils";
import {AdvancedSearchFilters, BookAdvancedSearchFilters} from "@/lib/schemas";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/advanced-search/AppliedSearchFilterChip";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {AdvancedSearchFilterDefinition, AppliedSearchFilterChipsProps, ProviderSearchFilterProps} from "@/lib/types/advanced-search.types";


const languageOptions = [
    { label: "Any language", value: null },
    { label: "English", value: "en" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Spanish", value: "es" },
    { label: "Italian", value: "it" },
    { label: "Japanese", value: "ja" },
] as const;


const createBookFilters = (applied?: AdvancedSearchFilters): BookAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.BOOKS) return { ...applied };
    return { provider: ApiProviderType.BOOKS };
};


const cleanBookFilters = (filters: AdvancedSearchFilters): BookAdvancedSearchFilters => {
    const bookFilters = createBookFilters(filters);

    return {
        ...bookFilters,
        isbn: cleanAdvancedSearchText(bookFilters.isbn),
        author: cleanAdvancedSearchText(bookFilters.author),
        subject: cleanAdvancedSearchText(bookFilters.subject),
        publisher: cleanAdvancedSearchText(bookFilters.publisher),
    };
};


const validateBookFilters = (query: string, filters: AdvancedSearchFilters) => {
    const bookFilters = cleanBookFilters(filters);
    const checkedISBN = bookFilters.isbn?.replace(/[\s-]/g, "");

    if (query.trim() && query.trim().length < 2) {
        return "Book titles must contain at least two characters.";
    }

    if (checkedISBN && !/^(?:\d{9}[\dX]|\d{13})$/i.test(checkedISBN)) {
        return "Enter a valid ISBN-10 or ISBN-13.";
    }

    if (![query.trim(), bookFilters.author, bookFilters.isbn, bookFilters.publisher, bookFilters.subject].some(Boolean)) {
        return "Add a title, author, ISBN, publisher, or subject to search books.";
    }
};


const BookFilterPanel = ({ filters, onChange }: ProviderSearchFilterProps) => {
    const bookFilters = createBookFilters(filters);

    return (
        <FieldGroup className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Field className="col-span-2 lg:col-span-1">
                <FieldLabel htmlFor="search-book-author">Author</FieldLabel>
                <Input
                    id="search-book-author"
                    placeholder="Ursula K. Le Guin"
                    value={bookFilters.author ?? ""}
                    onChange={(ev) => onChange({ ...bookFilters, author: ev.target.value })}
                />
            </Field>

            <Field>
                <FieldLabel htmlFor="search-book-isbn">ISBN</FieldLabel>
                <Input
                    id="search-book-isbn"
                    placeholder="9780441478125"
                    value={bookFilters.isbn ?? ""}
                    onChange={(ev) => onChange({ ...bookFilters, isbn: ev.target.value })}
                />
                <FieldDescription>ISBN-10 or ISBN-13.</FieldDescription>
            </Field>

            <Field>
                <FieldLabel htmlFor="search-book-publisher">Publisher</FieldLabel>
                <Input
                    placeholder="Ace Books"
                    id="search-book-publisher"
                    value={bookFilters.publisher ?? ""}
                    onChange={(ev) => onChange({ ...bookFilters, publisher: ev.target.value })}
                />
            </Field>

            <Field className="col-span-2 lg:col-span-1">
                <FieldLabel htmlFor="search-book-subject">Subject</FieldLabel>
                <Input
                    id="search-book-subject"
                    placeholder="Science fiction"
                    value={bookFilters.subject ?? ""}
                    onChange={(ev) => onChange({ ...bookFilters, subject: ev.target.value })}
                />
            </Field>

            <BookFilterSelect
                label="Language"
                items={languageOptions}
                id="search-book-language"
                value={bookFilters.language ?? null}
                onChange={(value) => onChange({ ...bookFilters, language: value as BookAdvancedSearchFilters["language"] })}
            />
        </FieldGroup>
    );
};


interface BookFilterSelectProps {
    id: string;
    label: string;
    value: string | null;
    onChange: (value: string | null) => void;
    items: ReadonlyArray<{ label: string; value: string | null }>;
}


const BookFilterSelect = ({ id, label, value, items, onChange }: BookFilterSelectProps) => (
    <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Select items={items} value={value} onValueChange={onChange}>
            <SelectTrigger id={id} className="w-full">
                <SelectValue/>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {items.map((option) =>
                        <SelectItem key={option.value ?? "any"} value={option.value}>
                            {option.label}
                        </SelectItem>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    </Field>
);


const bookChipLabels = {
    language: Object.fromEntries(languageOptions.map(({ value, label }) => [value, label])),
};


const BookAppliedFilters = ({ filters, onChange }: AppliedSearchFilterChipsProps) => {
    const bookFilters = createBookFilters(filters);
    const chips: Array<{ key: keyof BookAdvancedSearchFilters; label: string }> = [];

    if (bookFilters.isbn) chips.push({ key: "isbn", label: `ISBN: ${bookFilters.isbn}` });
    if (bookFilters.author) chips.push({ key: "author", label: `Author: ${bookFilters.author}` });
    if (bookFilters.subject) chips.push({ key: "subject", label: `Subject: ${bookFilters.subject}` });
    if (bookFilters.publisher) chips.push({ key: "publisher", label: `Publisher: ${bookFilters.publisher}` });
    if (bookFilters.language) chips.push({ key: "language", label: `Language: ${bookChipLabels.language[bookFilters.language]}` });

    return chips.map((chip) =>
        <AppliedSearchFilterChip
            key={chip.key}
            label={chip.label}
            onRemove={() => onChange({ ...bookFilters, [chip.key]: undefined })}
        />
    );
};


export const bookSearchFilterDefinition: AdvancedSearchFilterDefinition = {
    label: "Book filters",
    FilterPanel: BookFilterPanel,
    validate: validateBookFilters,
    createFilters: createBookFilters,
    AppliedFilters: BookAppliedFilters,
    cleanFilters: cleanBookFilters,
};
