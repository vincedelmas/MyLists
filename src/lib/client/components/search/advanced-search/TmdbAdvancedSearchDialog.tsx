import React, {useState} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {AdvancedSearchFilters, TmdbAdvancedSearchFilters} from "@/lib/schemas";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {AdvancedSearchDialogFrame} from "@/lib/client/components/search/advanced-search/AdvancedSearchDialogFrame";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import type {ProviderAdvancedSearchDialogProps} from "@/lib/client/components/search/advanced-search/advanced-search.types";
import {cleanAdvancedSearchText, countAdvancedSearchFilters, toOptionalNumber} from "@/lib/client/components/search/advanced-search/advanced-search.utils";


const tmdbMediaTypes = [MediaType.MOVIES, MediaType.SERIES, MediaType.ANIME] as const;


const yearLabels: Record<TmdbAdvancedSearchFilters["mediaType"], string> = {
    [MediaType.MOVIES]: "Release year",
    [MediaType.ANIME]: "First air year",
    [MediaType.SERIES]: "First air year",
};


const createTmdbFilters = (query: string, applied?: AdvancedSearchFilters): TmdbAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.TMDB) return applied;

    return {
        mediaType: MediaType.MOVIES,
        provider: ApiProviderType.TMDB,
        title: query?.trim() || undefined,
    };
};


export const TmdbAdvancedSearchDialog = ({ query, onApply, onClear, advancedFilters, onDialogOpenChange, triggerVariant }: ProviderAdvancedSearchDialogProps) => {
    const [open, setOpen] = useState(false);
    const [formError, setFormError] = useState<string>();
    const [filters, setFilters] = useState(() => createTmdbFilters(query, advancedFilters));
    const activeCount = advancedFilters?.provider === ApiProviderType.TMDB ? countAdvancedSearchFilters(advancedFilters) : 0;

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setFormError(undefined);
            setFilters(createTmdbFilters(query, advancedFilters));
        }
        setOpen(nextOpen);
        onDialogOpenChange?.(nextOpen);
    };

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        setFormError(undefined);

        const normalizedFilters = { ...filters, title: cleanAdvancedSearchText(filters.title) };

        if (normalizedFilters.title && normalizedFilters.title.length < 2) {
            setFormError("Media titles must contain at least two characters.");
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
            title="Advanced Media Search"
            onOpenChange={handleOpenChange}
            triggerVariant={triggerVariant}
        >
            <TmdbAdvancedSearchFields
                filters={filters}
                onChange={setFilters}
            />
        </AdvancedSearchDialogFrame>
    );
};


interface TmdbAdvancedSearchFieldsProps {
    filters: TmdbAdvancedSearchFilters;
    onChange: (filters: TmdbAdvancedSearchFilters) => void;
}


const TmdbAdvancedSearchFields = ({ filters, onChange }: TmdbAdvancedSearchFieldsProps) => (
    <FieldGroup>
        <FieldSet>
            <FieldLegend variant="label">
                Media type
            </FieldLegend>
            <FieldDescription>
                Choose one type so results and release dates stay precise.
            </FieldDescription>
            <ToggleGroup
                variant="outline"
                value={[filters.mediaType]}
                className="grid w-full grid-cols-3"
                onValueChange={(values) => {
                    const mediaType = values[0] as TmdbAdvancedSearchFilters["mediaType"] | undefined;
                    if (mediaType) onChange({ ...filters, mediaType });
                }}
            >
                {tmdbMediaTypes.map((mediaType) =>
                    <ToggleGroupItem key={mediaType} value={mediaType} className="w-full capitalize gap-1.5">
                        <MainThemeIcon type={mediaType}/>
                        {getMediaDefinition(mediaType).terminology.entry.plural}
                    </ToggleGroupItem>
                )}
            </ToggleGroup>
        </FieldSet>
        <FieldGroup className="grid sm:grid-cols-2">
            <Field>
                <FieldLabel htmlFor="advanced-media-title">
                    Title
                </FieldLabel>
                <Input
                    autoFocus
                    id="advanced-media-title"
                    value={filters.title ?? ""}
                    placeholder="Optional title"
                    onChange={(ev) => onChange({ ...filters, title: ev.target.value })}
                />
                <FieldDescription>
                    Leave blank to discover titles by type and year.
                </FieldDescription>
            </Field>
            <Field>
                <FieldLabel htmlFor="advanced-media-year">
                    {yearLabels[filters.mediaType]}
                </FieldLabel>
                <Input
                    min={1870}
                    max={2200}
                    type="number"
                    id="advanced-media-year"
                    value={filters.year ?? ""}
                    placeholder={new Date().getFullYear().toString()}
                    onChange={(ev) => onChange({ ...filters, year: toOptionalNumber(ev.target.value) })}
                />
            </Field>
        </FieldGroup>
    </FieldGroup>
);
