import {X} from "lucide-react";
import {MediaListArgs} from "@/lib/schemas";
import React, {useState} from "react";
import {useIsMutating, useQuery} from "@tanstack/react-query";
import {MediaType} from "@/lib/utils/enums";
import {Spinner} from "@/lib/client/components/ui/spinner";
import type {MediaCommonFilterKey, MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {MediaFiltersSheet, type MediaFiltersTab} from "@/lib/client/components/media/browse/MediaFiltersSheet";
import {MediaFilterTags, type MediaTagChange} from "@/lib/client/components/media/browse/MediaFilterTags";
import {listFiltersOptions} from "@/lib/client/react-query/query-options";
import {FieldGroup, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {MediaSpecificFilters} from "@/lib/client/components/media/browse/MediaSpecificFilters";
import {MediaFilterCheckbox} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";
import {getMediaCommonFilterKeys} from "@/lib/client/components/media/browse/media-filter.utils";
import {MediaGenreFilter, MediaPersonalFilters} from "@/lib/client/components/media/browse/MediaCommonFilters";


type AdvancedListFilters = Pick<MediaListArgs,
    Exclude<MediaCommonFilterKey, "search" | "status" | "minRating"> | MediaMetadataFilterKey | "hideCommon"
>;


interface FiltersSideSheetProps {
    open: boolean;
    username: string;
    isCurrent: boolean;
    mediaType: MediaType;
    filters: MediaListArgs;
    activeTab: MediaFiltersTab;
    onTabChange: (tab: MediaFiltersTab) => void;
    onTagChange: (change: MediaTagChange) => void;
    onOpenChange: (open: boolean) => void;
    onFilterApply: (filters: Partial<MediaListArgs>) => void;
}


export const FiltersSideSheet = ({ open, filters, username, mediaType, isCurrent, activeTab, onTabChange, onTagChange, onOpenChange, onFilterApply }: FiltersSideSheetProps) => {
    const [draft, setDraft] = useState<Partial<AdvancedListFilters>>({});
    const isEditingTags = useIsMutating({ mutationKey: ["userMediaEdit", mediaType] }) > 0;
    const { data: listFilters, isPending, error } = useQuery({
        ...listFiltersOptions(mediaType, username), enabled: open && activeTab === "filters",
    });

    const currentFilters = { ...filters, ...draft };
    const availableFilters = getMediaCommonFilterKeys([mediaType]);

    const handleSheetOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setDraft({});
        }
        onOpenChange(nextOpen);
    };

    const handleRegisterChange = <K extends keyof AdvancedListFilters>(filterType: K, value: AdvancedListFilters[K]) => {
        setDraft(current => ({ ...current, [filterType]: value }));
    };

    const handleOnSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        if (isEditingTags) return;
        const advancedFilters = { ...draft };

        for (const key of Object.keys(advancedFilters) as (keyof AdvancedListFilters)[]) {
            const value = advancedFilters[key];
            if (value === false || (Array.isArray(value) && value.length === 0)) {
                advancedFilters[key] = undefined;
            }
        }

        handleSheetOpenChange(false);
        onFilterApply(advancedFilters);
    };

    return (
        <MediaFiltersSheet
            open={open}
            onSubmit={handleOnSubmit}
            title="Additional Filters"
            activeTab={activeTab}
            onTabChange={onTabChange}
            onOpenChange={handleSheetOpenChange}
            description={<>How filters work <FilterInfoPopover/></>}
            footer={
                <FormSubmitButton className="w-full" disabled={activeTab === "filters" && !!error} isLoading={isEditingTags || (activeTab === "filters" && isPending)}>
                    Apply Filters
                </FormSubmitButton>
            }
            tags={availableFilters.has("tags") ?
                <MediaFilterTags
                    username={username}
                    mediaType={mediaType}
                    isOwner={isCurrent}
                    selected={currentFilters.tags ?? []}
                    onTagChange={change => {
                        setDraft(current => {
                            if (!current.tags?.includes(change.oldName)) return current;
                            return {
                                ...current,
                                tags: current.tags.flatMap(name => name === change.oldName ? change.newName ? [change.newName] : [] : [name]),
                            };
                        });
                        onTagChange(change);
                    }}
                    enabled={open && activeTab === "tags"}
                    onChange={tags => handleRegisterChange("tags", tags)}
                /> : undefined
            }
        >
            <FieldSet disabled={isPending}>
                {error ?
                    <div className="flex items-center justify-center h-[70vh]">
                        <EmptyState
                            icon={X}
                            message={error.message}
                        />
                    </div>
                    :
                    isPending ?
                        <div className="flex items-center justify-center h-[70vh]">
                            <Spinner className="size-10"/>
                        </div>
                        :
                        <FieldGroup>
                            <MediaGenreFilter
                                availableFilters={availableFilters}
                                selected={currentFilters.genres ?? []}
                                options={listFilters?.genres.map(genre => genre.name) ?? []}
                                onChange={genres => handleRegisterChange("genres", genres)}
                            />
                            <MediaSpecificFilters
                                mediaType={mediaType}
                                options={listFilters!}
                                filters={currentFilters}
                                onChange={next => setDraft(current => ({ ...current, ...next }))}
                            />
                            <FieldSet>
                                <FieldLegend variant="label">
                                    Miscellaneous
                                </FieldLegend>
                                <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
                                    <MediaPersonalFilters
                                        availableFilters={availableFilters}
                                        filters={currentFilters}
                                        onChange={next => setDraft(current => ({ ...current, ...next }))}
                                    />
                                    {!isCurrent &&
                                        <MediaFilterCheckbox
                                            label="Hide Common"
                                            checked={currentFilters.hideCommon ?? false}
                                            onChange={checked => handleRegisterChange("hideCommon", checked)}
                                        />
                                    }
                                </FieldGroup>
                            </FieldSet>
                        </FieldGroup>
                }
            </FieldSet>
        </MediaFiltersSheet>
    );
};


const FilterInfoPopover = () => (
    <InfoPopover label="Filter behavior information" align="end">
        <div className="flex flex-col gap-3 text-sm">
            <div className="flex gap-3">
                <div className="size-2 rounded-full bg-muted-foreground mt-1.5 shrink-0"/>
                <div>
                    <span className="font-medium text-info">
                        Same category filters:{" "}
                    </span>
                    Results include media matching <i>any</i> selected filter.
                    <div>(Filter A <strong>OR</strong> Filter B)</div>
                </div>
            </div>
            <div className="flex gap-3">
                <div className="size-2 rounded-full bg-muted-foreground mt-1.5 shrink-0"/>
                <div>
                    <span className="font-medium text-warning">
                        Different category filters:{" "}
                    </span>
                    Results include media matching <i>all</i> selected filters.
                    <div>(Filter A <strong>AND</strong> Filter B)</div>
                </div>
            </div>
        </div>
    </InfoPopover>
);
