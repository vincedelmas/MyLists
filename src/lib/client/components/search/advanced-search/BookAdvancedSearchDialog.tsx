import React, {useState} from "react";
import {ApiProviderType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import type {AdvancedSearchFilters, BookAdvancedSearchFilters} from "@/lib/schemas";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {AdvancedSearchDialogFrame} from "@/lib/client/components/search/advanced-search/AdvancedSearchDialogFrame";
import type {ProviderAdvancedSearchDialogProps} from "@/lib/client/components/search/advanced-search/advanced-search.types";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {cleanAdvancedSearchText, countAdvancedSearchFilters} from "@/lib/client/components/search/advanced-search/advanced-search.utils";


// TODO: why not allowed any 2 letter lang instead using free text
const languageOptions = [
    { label: "Any language", value: null },
    { label: "English", value: "en" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Spanish", value: "es" },
    { label: "Italian", value: "it" },
    { label: "Japanese", value: "ja" },
];


const createBookFilters = (query: string, applied?: AdvancedSearchFilters): BookAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.BOOKS) return applied;

    return {
        provider: ApiProviderType.BOOKS,
        title: query?.trim() || undefined,
    };
};


export const BookAdvancedSearchDialog = ({ query, onApply, onClear, advancedFilters, onDialogOpenChange, triggerVariant }: ProviderAdvancedSearchDialogProps) => {
    const [open, setOpen] = useState(false);
    const [formError, setFormError] = useState<string>();
    const [isbnError, setIsbnError] = useState<string>();
    const [filters, setFilters] = useState(() => createBookFilters(query, advancedFilters));
    const activeCount = advancedFilters?.provider === ApiProviderType.BOOKS ? countAdvancedSearchFilters(advancedFilters) : 0;

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setFormError(undefined);
            setIsbnError(undefined);
            setFilters(createBookFilters(query, advancedFilters));
        }
        setOpen(nextOpen);
        onDialogOpenChange?.(nextOpen);
    };

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        setFormError(undefined);
        setIsbnError(undefined);

        const normalizedFilters: BookAdvancedSearchFilters = {
            ...filters,
            isbn: cleanAdvancedSearchText(filters.isbn),
            title: cleanAdvancedSearchText(filters.title),
            author: cleanAdvancedSearchText(filters.author),
            subject: cleanAdvancedSearchText(filters.subject),
            publisher: cleanAdvancedSearchText(filters.publisher),
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
        handleOpenChange(false);
    };

    return (
        <AdvancedSearchDialogFrame
            open={open}
            onClear={onClear}
            formError={formError}
            onSubmit={handleSubmit}
            activeCount={activeCount}
            title={"Advanced Book Search"}
            onOpenChange={handleOpenChange}
            triggerVariant={triggerVariant}
        >
            <BookAdvancedSearchFields
                filters={filters}
                isbnError={isbnError}
                onChange={setFilters}
            />
        </AdvancedSearchDialogFrame>
    );
};


interface BookAdvancedSearchFieldsProps {
    isbnError?: string;
    filters: BookAdvancedSearchFilters;
    onChange: (filters: BookAdvancedSearchFilters) => void;
}


const BookAdvancedSearchFields = ({ filters, isbnError, onChange }: BookAdvancedSearchFieldsProps) => (
    <FieldGroup className="grid grid-cols-2 gap-3 sm:gap-5">
        <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="advanced-book-title">
                Title
            </FieldLabel>
            <Input
                autoFocus
                id="advanced-book-title"
                value={filters.title ?? ""}
                placeholder="The Left Hand of Darkness"
                onChange={(ev) => onChange({ ...filters, title: ev.target.value })}
            />
        </Field>
        <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor="advanced-book-author">
                Author
            </FieldLabel>
            <Input
                id="advanced-book-author"
                value={filters.author ?? ""}
                placeholder="Ursula K. Le Guin"
                onChange={(ev) => onChange({ ...filters, author: ev.target.value })}
            />
        </Field>
        <Field className="col-span-2 sm:col-span-1" data-invalid={!!isbnError}>
            <FieldLabel htmlFor="advanced-book-isbn">
                ISBN
            </FieldLabel>
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
            <FieldLabel htmlFor="advanced-book-publisher">
                Publisher
            </FieldLabel>
            <Input
                placeholder="Ace Books"
                id="advanced-book-publisher"
                value={filters.publisher ?? ""}
                onChange={(ev) => onChange({ ...filters, publisher: ev.target.value })}
            />
        </Field>
        <Field className="col-span-2">
            <FieldLabel htmlFor="advanced-book-subject">
                Subject
            </FieldLabel>
            <Input
                id="advanced-book-subject"
                value={filters.subject ?? ""}
                placeholder="Science fiction"
                onChange={(ev) => onChange({ ...filters, subject: ev.target.value })}
            />
        </Field>
        <Field>
            <FieldLabel htmlFor="advanced-book-language">
                Language
            </FieldLabel>
            <Select
                items={languageOptions}
                value={filters.language ?? null}
                onValueChange={(value: string | null) => onChange({ ...filters, language: value as BookAdvancedSearchFilters["language"] })}
            >
                <SelectTrigger id="advanced-book-language" className="w-full">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {languageOptions.map((option) =>
                            <SelectItem key={option.value ?? "any"} value={option.value}>
                                {option.label}
                            </SelectItem>
                        )}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </Field>
    </FieldGroup>
);
