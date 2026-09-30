import {Film, Tv} from "lucide-react";
import {Input} from "@/lib/client/components/ui/input";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {toOptionalNumber} from "@/lib/utils/media/advanced-search";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {AppliedSearchFilterChip} from "@/lib/client/components/search/AppliedSearchFilterChip";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle} from "@/lib/client/components/ui/field";
import {AdvancedSearchFilterDefinition, AppliedSearchFilterChipsProps, ProviderSearchFilterProps} from "@/lib/types/advanced-search.types";
import {AdvancedSearchFilters, TmdbAdvancedSearchFilters, cleanTmdbAdvancedSearchFilters, validateTmdbAdvancedSearch} from "@/lib/schemas";


const createTmdbFilters = (applied?: AdvancedSearchFilters): TmdbAdvancedSearchFilters => {
    if (applied?.provider === ApiProviderType.TMDB) return { ...applied };
    return { provider: ApiProviderType.TMDB };
};


const TmdbFilterPanel = ({ filters, onChange }: ProviderSearchFilterProps) => {
    const tmdbFilters = createTmdbFilters(filters);

    return (
        <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field>
                <FieldTitle id="search-media-type-label">Media type</FieldTitle>
                <ToggleGroup
                    variant="outline"
                    value={[tmdbFilters.mediaType ?? "all"]}
                    aria-labelledby="search-media-type-label"
                    onValueChange={([value]) => {
                        if (!value) return;
                        const mediaType = value === MediaType.MOVIES ? MediaType.MOVIES
                            : value === MediaType.SERIES ? MediaType.SERIES : undefined;
                        onChange({ ...tmdbFilters, mediaType, releaseYear: mediaType ? tmdbFilters.releaseYear : undefined });
                    }}
                >
                    <ToggleGroupItem value="all">
                        All media
                    </ToggleGroupItem>
                    <ToggleGroupItem value={MediaType.MOVIES}>
                        <Film data-icon="inline-start"/>Movies
                    </ToggleGroupItem>
                    <ToggleGroupItem value={MediaType.SERIES}>
                        <Tv data-icon="inline-start"/>TV shows
                    </ToggleGroupItem>
                </ToggleGroup>
                {!tmdbFilters.mediaType &&
                    <FieldDescription>
                        Choose Movies or TV shows to filter by year.
                    </FieldDescription>
                }
            </Field>

            {tmdbFilters.mediaType &&
                <Field>
                    <FieldLabel htmlFor="search-media-year">
                        {tmdbFilters.mediaType === MediaType.MOVIES ? "Release year" : "First-air year"}
                    </FieldLabel>
                    <Input
                        step={1}
                        min={1870}
                        max={8000}
                        type="number"
                        id="search-media-year"
                        placeholder="Any year"
                        value={tmdbFilters.releaseYear ?? ""}
                        onChange={(ev) => onChange({ ...tmdbFilters, releaseYear: toOptionalNumber(ev.target.value) })}
                    />
                    <FieldDescription>
                        {tmdbFilters.mediaType === MediaType.MOVIES
                            ? "Optional. The movie’s original release year."
                            : "Optional. The year the TV show first aired."
                        }
                    </FieldDescription>
                </Field>
            }
        </FieldGroup>
    );
};


const TmdbAppliedFilters = ({ filters, onChange }: AppliedSearchFilterChipsProps) => {
    const tmdbFilters = createTmdbFilters(filters);

    return (
        <>
            {tmdbFilters.mediaType &&
                <AppliedSearchFilterChip
                    onRemove={() => onChange({ provider: ApiProviderType.TMDB })}
                    label={tmdbFilters.mediaType === MediaType.MOVIES ? "Movies" : "TV shows"}
                />
            }
            {tmdbFilters.releaseYear !== undefined &&
                <AppliedSearchFilterChip
                    onRemove={() => onChange({ ...tmdbFilters, releaseYear: undefined })}
                    label={`${tmdbFilters.mediaType === MediaType.MOVIES ? "Release year" : "First-air year"}: ${tmdbFilters.releaseYear}`}
                />
            }
        </>
    );
};


export const tmdbSearchFilterDefinition: AdvancedSearchFilterDefinition = {
    label: "Movie & TV filters",
    FilterPanel: TmdbFilterPanel,
    createFilters: createTmdbFilters,
    AppliedFilters: TmdbAppliedFilters,
    validate: validateTmdbAdvancedSearch,
    cleanFilters: cleanTmdbAdvancedSearchFilters,
};
