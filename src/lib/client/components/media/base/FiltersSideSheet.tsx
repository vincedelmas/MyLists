import {X} from "lucide-react";
import {MediaListArgs} from "@/lib/schemas";
import React, {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {JobType, MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import type {MediaListFilterKey} from "@/lib/types/media-list.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {MediaFiltersSheet} from "@/lib/client/components/media/browse/MediaFiltersSheet";
import {filterSearchOptions, listFiltersOptions} from "@/lib/client/react-query/query-options";
import {Field, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {MediaFilterCheckbox, MediaFilterCheckboxGroup} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";


type AdvancedListFilters = Pick<MediaListArgs, MediaListFilterKey | "favorite" | "comment" | "hideCommon">;


interface FiltersSideSheetProps {
    open: boolean;
    username: string;
    isCurrent: boolean;
    mediaType: MediaType;
    filters: MediaListArgs;
    onOpenChange: (open: boolean) => void;
    onFilterApply: (filters: Partial<MediaListArgs>) => void;
}


export const FiltersSideSheet = ({ open, filters, username, mediaType, isCurrent, onOpenChange, onFilterApply }: FiltersSideSheetProps) => {
    const [draft, setDraft] = useState<Partial<AdvancedListFilters>>({});
    const { data: listFilters, isPending, error } = useQuery({ ...listFiltersOptions(mediaType, username), enabled: open });

    const currentFilters = { ...filters, ...draft };
    const activeFiltersConfig = mediaConfig[mediaType].sheetFilters();

    const handleSheetOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) setDraft({});
        onOpenChange(nextOpen);
    };

    const handleRegisterChange = <K extends keyof AdvancedListFilters>(filterType: K, value: AdvancedListFilters[K]) => {
        setDraft(current => ({ ...current, [filterType]: value }));
    };

    const handleOnSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        const advancedFilters = { ...draft };

        for (const key of Object.keys(advancedFilters) as (keyof AdvancedListFilters)[]) {
            const value = advancedFilters[key];
            if (value === false || (Array.isArray(value) && value.length === 0)) {
                advancedFilters[key] = undefined;
            }
        }

        onFilterApply(advancedFilters);
        handleSheetOpenChange(false);
    };

    return (
        <MediaFiltersSheet
            open={open}
            onSubmit={handleOnSubmit}
            title="Additional Filters"
            onOpenChange={handleSheetOpenChange}
            description={<>How filters work <FilterInfoPopover/></>}
            footer={
                <FormSubmitButton className="w-full" disabled={!!error} isLoading={isPending}>
                    Apply Filters
                </FormSubmitButton>
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
                            <MediaFilterCheckboxGroup
                                title="Genres"
                                selected={currentFilters.genres ?? []}
                                items={listFilters?.genres.map(genre => genre.name) ?? []}
                                onChange={genres => handleRegisterChange("genres", genres)}
                            />
                            {activeFiltersConfig.map((filter) => {
                                if (filter.type === "checkbox") {
                                    const items = filter.getItems(listFilters!);
                                    if (!items || items.length === 0) return null;

                                    return (
                                        <MediaFilterCheckboxGroup
                                            key={filter.key}
                                            title={filter.title}
                                            items={items.map(item => item.name)}
                                            selected={currentFilters[filter.key] ?? []}
                                            onChange={values => handleRegisterChange(filter.key, values)}
                                            renderLabel={name => filter.render ? filter.render(name, mediaType) : name}
                                        />
                                    );
                                }
                                if (filter.type === "search") {
                                    return (
                                        <SearchFilter
                                            key={filter.key}
                                            job={filter.job}
                                            username={username}
                                            title={filter.title}
                                            mediaType={mediaType}
                                            dataList={currentFilters[filter.key] ?? []}
                                            onChange={values => handleRegisterChange(filter.key, values)}
                                        />
                                    );
                                }
                                return null;
                            })}
                            <FieldSet>
                                <FieldLegend variant="label">
                                    Miscellaneous
                                </FieldLegend>
                                <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
                                    <MediaFilterCheckbox
                                        label="Favorites"
                                        checked={currentFilters.favorite ?? false}
                                        onChange={checked => handleRegisterChange("favorite", checked)}
                                    />
                                    <MediaFilterCheckbox
                                        label="Comments"
                                        checked={currentFilters.comment ?? false}
                                        onChange={checked => handleRegisterChange("comment", checked)}
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
                            <MediaFilterCheckboxGroup
                                title="Tags"
                                selected={currentFilters.tags ?? []}
                                items={listFilters?.tags.map(tag => tag.name) ?? []}
                                onChange={tags => handleRegisterChange("tags", tags)}
                            />
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


interface SearchFilterProps {
    job: JobType;
    title: string;
    username: string;
    dataList: string[];
    mediaType: MediaType;
    onChange: (values: string[]) => void;
}


const SearchFilter = ({ mediaType, username, job, title, dataList, onChange }: SearchFilterProps) => {
    const fieldId = useId();
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer();
    const { data: filterResults, isPending, error } = useQuery(filterSearchOptions(mediaType, username, debouncedSearch, job));

    const handleSearchClick = (data: string) => {
        reset();
        if (dataList.includes(data)) return;

        onChange([...dataList, data]);
    };

    const handleRemoveData = (data: string) => {
        onChange(dataList.filter(item => item !== data));
    };

    return (
        <Field>
            <FieldLabel htmlFor={`${fieldId}-search`}>
                {title}
            </FieldLabel>
            <div ref={containerRef} className="relative">
                <SearchInput
                    value={search}
                    className="w-70"
                    id={`${fieldId}-search`}
                    placeholder={`Search ${title.toLowerCase()}...`}
                    onChange={(ev) => setSearch(ev.target.value)}
                />
                <SearchContainer
                    error={error}
                    isOpen={isOpen}
                    search={search}
                    className="w-70"
                    isPending={isPending}
                    debouncedSearch={debouncedSearch}
                    hasResults={!!filterResults?.length}
                >
                    <div className="flex flex-col overflow-y-auto scrollbar-thin max-h-60">
                        {filterResults?.map((item) =>
                            <button
                                type="button"
                                key={item.name}
                                onClick={() => handleSearchClick(item.name!)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors"
                            >
                                <ProfileIcon
                                    fallbackSize="text-xs"
                                    className="size-9 border"
                                    user={{ image: null, name: item.name! }}
                                />
                                <span className="text-left">
                                    {item.name}
                                </span>
                            </button>
                        )}
                    </div>
                </SearchContainer>
            </div>
            <div className="flex flex-wrap gap-2">
                {dataList.map(item =>
                    <Badge key={item} variant="outline">
                        {item}
                        <Button size="bare" type="button" variant="ghost" onClick={() => handleRemoveData(item)}>
                            <X/>
                        </Button>
                    </Badge>
                )}
            </div>
        </Field>
    );
};
