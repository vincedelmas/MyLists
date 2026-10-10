import {MAX_MEDIA_FILTER_VALUES} from "@/lib/media-definitions/base/media-filters";
import {useId, useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import type {MediaMetadataFilterOptions} from "@/lib/types/media-list.types";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {MediaFiltersSheet, type MediaFiltersTab} from "@/lib/client/components/media/browse/MediaFiltersSheet";
import {MediaFilterSearch} from "@/lib/client/components/media/browse/MediaFilterSearch";
import {Field, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {type MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {MediaFilterCheckbox} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";
import {MediaSpecificFilters} from "@/lib/client/components/media/browse/MediaSpecificFilters";
import {getMediaCommonFilterKeys} from "@/lib/client/components/media/browse/media-filter.utils";
import {MediaGenreFilter, MediaPersonalFilters} from "@/lib/client/components/media/browse/MediaCommonFilters";


type AdvancedFilters = Pick<MediaBrowseFilters, "genres" | "tags" | "favorite" | "comment" | "minRating" | "mediaFilters"> & { hideCommon?: boolean };


interface MediaBrowseFiltersSheetProps {
    open: boolean;
    personal: boolean;
    filters: MediaBrowseFilters & { hideCommon?: boolean };
    allowHideCommon?: boolean;
    isPending?: boolean;
    error?: Error | null;
    onRetry?: () => void;
    onOpenChange: (open: boolean) => void;
    onApply: (filters: AdvancedFilters) => void;
    options: {
        genres: string[];
        tags: string[];
        mediaTypes?: MediaType[];
        mediaFilters?: Partial<Record<MediaType, MediaMetadataFilterOptions>>;
    };
}


export const MediaBrowseFiltersSheet = ({ open, onOpenChange, filters, options, personal, allowHideCommon = false, isPending = false, error, onRetry, onApply }: MediaBrowseFiltersSheetProps) => {
    const fieldId = useId();
    const [activeTab, setActiveTab] = useState<MediaFiltersTab>("filters");
    const [draft, setDraft] = useState<AdvancedFilters>(() => ({
        tags: filters.tags,
        genres: filters.genres,
        favorite: filters.favorite,
        comment: filters.comment,
        minRating: filters.minRating,
        mediaFilters: filters.mediaFilters,
        hideCommon: filters.hideCommon,
    }));
    const mediaTypes = filters.mediaType ? [filters.mediaType] : options.mediaTypes ?? Object.keys(options.mediaFilters ?? {}) as MediaType[];
    const availableFilters = getMediaCommonFilterKeys(mediaTypes);

    return (
        <MediaFiltersSheet
            open={open}
            title="Additional filters"
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tags={personal && availableFilters.has("tags") ? error ?
                <Alert variant="destructive"><AlertDescription>We couldn’t load tags. {onRetry && <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>}</AlertDescription></Alert>
                : isPending ?
                <div role="status" aria-label="Loading tags" className="flex justify-center py-12"><Spinner className="size-8"/></div>
                : <MediaFilterSearch
                    label="Tags"
                    options={options.tags}
                    value={draft.tags ?? []}
                    maxSelected={MAX_MEDIA_FILTER_VALUES}
                    onChange={tags => setDraft(current => ({ ...current, tags: tags.length ? tags : undefined }))}
                /> : undefined}
            onOpenChange={onOpenChange}
            description="Narrow the titles shown here. Your saved list and views stay as they are."
            onSubmit={ev => {
                ev.preventDefault();
                if (isPending || error) return;
                onApply(draft);
                onOpenChange(false);
            }}
            footer={<>
                <Button type="submit" disabled={isPending || !!error}>Apply filters</Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        onApply({ genres: undefined, tags: undefined, favorite: undefined, comment: undefined, minRating: undefined, mediaFilters: undefined, hideCommon: undefined });
                        onOpenChange(false);
                    }}
                >
                    Clear advanced filters
                </Button>
            </>}
        >
            {error ?
                <Alert variant="destructive">
                    <AlertDescription>
                        We couldn’t load filter options.
                        {onRetry && <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>}
                    </AlertDescription>
                </Alert>
                : isPending ?
                <div role="status" aria-label="Loading filter options" className="flex justify-center py-12">
                    <Spinner className="size-8"/>
                </div>
                : <>
                    <MediaGenreFilter
                        availableFilters={availableFilters}
                        options={options.genres}
                        selected={draft.genres ?? []}
                        maxSelected={MAX_MEDIA_FILTER_VALUES}
                        onChange={genres => setDraft(current => ({ ...current, genres: genres.length ? genres : undefined }))}
                    />
                    {mediaTypes.map(mediaType =>
                        <FieldSet key={mediaType}>
                            <FieldLegend variant="label">
                                {mediaType === MediaType.SERIES ? "TV series" : capitalize(mediaType)}
                            </FieldLegend>
                            <MediaSpecificFilters
                                mediaType={mediaType}
                                options={options.mediaFilters?.[mediaType] ?? {}}
                                filters={draft.mediaFilters?.[mediaType] ?? {}}
                                maxSelected={MAX_MEDIA_FILTER_VALUES}
                                onChange={next => setDraft(current => ({
                                    ...current,
                                    mediaFilters: {
                                        ...current.mediaFilters,
                                        [mediaType]: { ...current.mediaFilters?.[mediaType], ...next },
                                    },
                                }))}
                            />
                        </FieldSet>
                    )}
                    {personal &&
                        <FieldSet>
                            <FieldLegend variant="label">
                                List filters
                            </FieldLegend>
                            <FieldGroup>
                                <MediaPersonalFilters
                                    availableFilters={availableFilters}
                                    filters={draft}
                                    favoriteLabel="Favorites only"
                                    commentLabel="Comments only"
                                    onChange={next => setDraft(current => ({ ...current, ...next }))}
                                />
                                {allowHideCommon &&
                                    <MediaFilterCheckbox
                                        label="Hide Common"
                                        checked={draft.hideCommon ?? false}
                                        onChange={checked => setDraft(current => ({ ...current, hideCommon: checked ? true : undefined }))}
                                    />
                                }
                                {availableFilters.has("minRating") &&
                                    <Field>
                                        <FieldLabel htmlFor={`${fieldId}-rating`}>
                                            Minimum rating
                                        </FieldLabel>
                                        <Input
                                            min={0}
                                            max={10}
                                            step={0.5}
                                            type="number"
                                            id={`${fieldId}-rating`}
                                            placeholder="Any rating"
                                            value={draft.minRating ?? ""}
                                            onChange={ev => setDraft(current => ({
                                                ...current,
                                                minRating: ev.target.value === "" ? undefined : Number(ev.target.value),
                                            }))}
                                        />
                                    </Field>
                                }
                            </FieldGroup>
                        </FieldSet>
                    }
                </>
            }
        </MediaFiltersSheet>
    );
};
