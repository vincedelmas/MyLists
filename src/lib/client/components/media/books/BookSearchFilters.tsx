import {ApiProviderType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/AppliedSearchFilterChip";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {AdvancedSearchFilterDefinition, AppliedSearchFilterChipsProps, ProviderSearchFilterProps} from "@/lib/types/advanced-search.types";
import {AdvancedSearchFilters, BookAdvancedSearchFilters, cleanBookAdvancedSearchFilters, validateBookAdvancedSearch} from "@/lib/schemas";


const createBookFilters = (applied?: AdvancedSearchFilters): BookAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.BOOKS) return { ...applied };
    return { provider: ApiProviderType.BOOKS };
};


const BookFilterPanel = ({ filters, onChange }: ProviderSearchFilterProps) => {
    const bookFilters = createBookFilters(filters);

    return (
        <FieldGroup className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
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

            <Field>
                <FieldLabel htmlFor="search-book-language">Language</FieldLabel>
                <Input
                    maxLength={2}
                    placeholder="en"
                    autoCapitalize="none"
                    id="search-book-language"
                    value={bookFilters.language ?? ""}
                    onChange={(ev) => onChange({ ...bookFilters, language: ev.target.value })}
                />
                <FieldDescription>Two-letter language code.</FieldDescription>
            </Field>
        </FieldGroup>
    );
};


const BookAppliedFilters = ({ filters, onChange }: AppliedSearchFilterChipsProps) => {
    const bookFilters = createBookFilters(filters);
    const chips: Array<{ key: keyof BookAdvancedSearchFilters; label: string }> = [];

    if (bookFilters.isbn) chips.push({ key: "isbn", label: `ISBN: ${bookFilters.isbn}` });
    if (bookFilters.author) chips.push({ key: "author", label: `Author: ${bookFilters.author}` });
    if (bookFilters.subject) chips.push({ key: "subject", label: `Subject: ${bookFilters.subject}` });
    if (bookFilters.publisher) chips.push({ key: "publisher", label: `Publisher: ${bookFilters.publisher}` });
    if (bookFilters.language) chips.push({ key: "language", label: `Language: ${bookFilters.language.toUpperCase()}` });

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
    createFilters: createBookFilters,
    AppliedFilters: BookAppliedFilters,
    validate: validateBookAdvancedSearch,
    cleanFilters: cleanBookAdvancedSearchFilters,
};
