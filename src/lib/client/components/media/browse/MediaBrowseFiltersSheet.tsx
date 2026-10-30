import {useId, useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {type MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {MAX_MEDIA_FILTER_VALUES} from "@/lib/media-definitions/base/media-filters";
import {MediaTagBrowser} from "@/lib/client/components/media/browse/MediaTagBrowser";
import {MediaTagFilters} from "@/lib/client/components/media/browse/MediaTagFilters";
import {MediaTypeFilterTabs} from "@/lib/client/components/media/browse/MediaTypeFilterTabs";
import {MediaSpecificFilters} from "@/lib/client/components/media/browse/MediaSpecificFilters";
import {getMediaCommonFilterKeys} from "@/lib/client/components/media/browse/media-filter.utils";
import {MediaFilterCheckbox} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";
import type {MediaFilterSearchSource, ScopedMediaFilterOptions} from "@/lib/types/media-list.types";
import {MediaGenreFilter, MediaPersonalFilters} from "@/lib/client/components/media/browse/MediaCommonFilters";
import {MediaFiltersSheet, type MediaFiltersTab} from "@/lib/client/components/media/browse/MediaFiltersSheet";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


type AdvancedFilters = Pick<MediaBrowseFilters, "genres" | "tags" | "favorite" | "comment" | "minRating" | "mediaFilters"> & { hideCommon?: boolean };


interface MediaBrowseFiltersSheetProps {
    open: boolean;
    personal: boolean;
    isPending?: boolean;
    error?: Error | null;
    onRetry?: () => void;
    personalLabel?: string;
    allowHideCommon?: boolean;
    onOpenChange: (open: boolean) => void;
    searchSource: MediaFilterSearchSource;
    filters: MediaBrowseFilters & { hideCommon?: boolean };
    onApply: (filters: AdvancedFilters) => void | Promise<void>;
    options: {
        tags: string[];
        genres: string[];
        mediaTypes?: MediaType[];
        mediaFilters?: ScopedMediaFilterOptions;
    };
}


export const MediaBrowseFiltersSheet = (props: MediaBrowseFiltersSheetProps) => {
    const {
        open, error, filters, onRetry, onApply, options, personal, searchSource, onOpenChange,
        isPending = false, allowHideCommon = false, personalLabel = "Tracking filters",
    } = props;

    const fieldId = useId();
    const [activeTab, setActiveTab] = useState<MediaFiltersTab>("filters");
    const [applying, setApplying] = useState<"apply" | "clear" | null>(null);
    const mediaTypes = options.mediaTypes ?? Object.keys(options.mediaFilters ?? {}) as MediaType[];

    const availableFilters = getMediaCommonFilterKeys(mediaTypes);
    const [draft, setDraft] = useState<AdvancedFilters>(() => ({
        tags: filters.tags,
        genres: filters.genres,
        comment: filters.comment,
        favorite: filters.favorite,
        minRating: filters.minRating,
        hideCommon: filters.hideCommon,
        mediaFilters: filters.mediaFilters,
    }));

    return (
        <MediaFiltersSheet
            open={open}
            activeTab={activeTab}
            title="Additional filters"
            onTabChange={setActiveTab}
            onOpenChange={onOpenChange}
            description="Narrow the titles shown here. Your saved list and views stay as they are."
            onSubmit={async (ev) => {
                ev.preventDefault();
                if (isPending || error || applying) return;
                setApplying("apply");
                try {
                    await onApply(draft);
                    onOpenChange(false);
                }
                finally {
                    setApplying(null);
                }
            }}
            tags={mediaTypes.length < 2 && personal && availableFilters.has("tags") ?
                error ?
                    <Alert variant="destructive">
                        <AlertDescription>
                            We couldn’t load tags.
                            {onRetry &&
                                <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
                                    Try again
                                </Button>
                            }
                        </AlertDescription>
                    </Alert>
                    :
                    isPending ?
                        <div role="status" className="flex justify-center py-12">
                            <Spinner className="size-8"/>
                        </div>
                        :
                        <MediaTagFilters
                            filters={draft.mediaFilters?.[mediaTypes[0]] ?? {}}
                            options={options.mediaFilters?.[mediaTypes[0]]?.tags?.map(item => item.name) ?? []}
                            onChange={(next) => setDraft(curr => ({
                                ...curr, mediaFilters: {
                                    ...curr.mediaFilters,
                                    [mediaTypes[0]]: { ...curr.mediaFilters?.[mediaTypes[0]], ...next },
                                }
                            }))}
                        />
                :
                undefined
            }
            footer={
                <>
                    <LoadingButton type="submit" isLoading={applying === "apply"} disabled={isPending || !!error || applying === "clear"}>
                        Apply filters
                    </LoadingButton>
                    <LoadingButton
                        type="button"
                        variant="outline"
                        disabled={applying === "apply"}
                        isLoading={applying === "clear"}
                        onClick={async () => {
                            setApplying("clear");
                            try {
                                await onApply({
                                    tags: undefined,
                                    genres: undefined,
                                    comment: undefined,
                                    favorite: undefined,
                                    minRating: undefined,
                                    hideCommon: undefined,
                                    mediaFilters: undefined,
                                });
                                onOpenChange(false);
                            }
                            finally {
                                setApplying(null);
                            }
                        }}
                    >
                        Clear advanced filters
                    </LoadingButton>
                </>
            }
        >
            {error ?
                <Alert variant="destructive">
                    <AlertDescription>
                        We couldn’t load filter options.
                        {onRetry &&
                            <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
                                Try again
                            </Button>
                        }
                    </AlertDescription>
                </Alert>
                :
                isPending ?
                    <div role="status" className="flex justify-center py-12">
                        <Spinner className="size-8"/>
                    </div>
                    :
                    <MediaTypeFilterTabs
                        mediaTypes={mediaTypes}
                        filters={draft.mediaFilters ?? {}}
                        commonCount={
                            Number(!!draft.favorite) + Number(!!draft.comment) +
                            Number(draft.minRating !== undefined) + Number(!!draft.hideCommon) + (draft.genres?.length ?? 0) +
                            (draft.tags?.length ?? 0)
                        }
                        common={(personal || !!draft.genres?.length || !!draft.tags?.length) &&
                            <FieldGroup>
                                {personal &&
                                    <FieldSet>
                                        <FieldLegend variant="label">
                                            {personalLabel}
                                        </FieldLegend>
                                        <FieldDescription>
                                            These filters use tracking data and exclude titles that aren’t tracked.
                                        </FieldDescription>
                                        <FieldGroup>
                                            <MediaPersonalFilters
                                                filters={draft}
                                                commentLabel="Comments only"
                                                favoriteLabel="Favorites only"
                                                availableFilters={availableFilters}
                                                onChange={next => setDraft(curr => ({ ...curr, ...next }))}
                                            />
                                            {allowHideCommon &&
                                                <MediaFilterCheckbox
                                                    label="Hide Common"
                                                    checked={draft.hideCommon ?? false}
                                                    onChange={checked => setDraft(curr => ({ ...curr, hideCommon: checked ? true : undefined }))}
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
                                                        onChange={ev => setDraft(curr => ({
                                                            ...curr,
                                                            minRating: ev.target.value === "" ? undefined : Number(ev.target.value),
                                                        }))}
                                                    />
                                                </Field>
                                            }
                                        </FieldGroup>
                                    </FieldSet>
                                }

                                {(!!draft.genres?.length || !!draft.tags?.length) &&
                                    <FieldSet>
                                        <FieldLegend variant="label">
                                            Rules across all types
                                        </FieldLegend>
                                        <FieldDescription>
                                            These existing rules apply to every media type.
                                        </FieldDescription>
                                        <MediaGenreFilter
                                            options={options.genres}
                                            selected={draft.genres ?? []}
                                            availableFilters={availableFilters}
                                            onChange={genres => setDraft(curr => ({ ...curr, genres: genres.length ? genres : undefined }))}
                                        />
                                        {personal &&
                                            <MediaTagBrowser
                                                label="Tags"
                                                options={options.tags}
                                                value={draft.tags ?? []}
                                                onChange={tags => setDraft(curr => ({ ...curr, tags: tags.length ? tags : undefined }))}
                                            />
                                        }
                                    </FieldSet>
                                }
                            </FieldGroup>
                        }
                    >
                        {mediaType => {
                            const multiple = mediaTypes.length > 1;
                            const scoped = draft.mediaFilters?.[mediaType] ?? {};
                            const typeOptions = options.mediaFilters?.[mediaType] ?? {};

                            const update = (next: Partial<typeof scoped>) => {
                                setDraft(curr => ({
                                    ...curr,
                                    mediaFilters: {
                                        ...curr.mediaFilters,
                                        [mediaType]: {
                                            ...curr.mediaFilters?.[mediaType],
                                            ...next,
                                        },
                                    }
                                }))
                            };

                            return (
                                <FieldSet aria-label={mediaType}>
                                    <MediaGenreFilter
                                        selected={scoped.genres ?? []}
                                        maxSelected={MAX_MEDIA_FILTER_VALUES}
                                        availableFilters={getMediaCommonFilterKeys([mediaType])}
                                        options={typeOptions.genres?.map(item => item.name) ?? []}
                                        onChange={genres => update({ genres: genres.length ? genres : undefined })}
                                    />
                                    <MediaSpecificFilters
                                        filters={scoped}
                                        onChange={update}
                                        mediaType={mediaType}
                                        options={typeOptions}
                                        searchSource={searchSource}
                                        maxSelected={MAX_MEDIA_FILTER_VALUES}
                                    />
                                    {personal && multiple &&
                                        <MediaTagFilters
                                            filters={scoped}
                                            onChange={update}
                                            options={typeOptions.tags?.map(item => item.name) ?? []}
                                        />
                                    }
                                </FieldSet>
                            );
                        }}
                    </MediaTypeFilterTabs>
            }
        </MediaFiltersSheet>
    );
};
