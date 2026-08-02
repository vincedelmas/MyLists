import {MediaListArgs} from "@/lib/schemas";
import {useQuery} from "@tanstack/react-query";
import React, {useId, useRef, useState} from "react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {ChevronDown, ChevronUp, CircleHelp, X} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {GamesPlatformsEnum, JobType, MediaType, Status} from "@/lib/utils/enums";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {filterSearchOptions, listFiltersOptions} from "@/lib/client/react-query/query-options";
import {Field, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";


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
    const fieldId = useId();
    const localFiltersRef = useRef<Partial<MediaListArgs>>({});
    const activeFiltersConfig = mediaConfig[mediaType].sheetFilters();
    const { data: listFilters, isPending, error } = useQuery({ ...listFiltersOptions(mediaType, username), enabled: open });

    const handleSheetOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) localFiltersRef.current = {};
        onOpenChange(nextOpen);
    };

    const handleRegisterChange = (filterType: keyof MediaListArgs, value: string[] | boolean) => {
        const updatedFilters = { ...localFiltersRef.current };

        if (Array.isArray(value)) {
            const prev = updatedFilters[filterType] as string[] | undefined;
            let newArr: string[];
            if (prev) {
                newArr = [...prev];
                value.forEach((val) => {
                    if (newArr.includes(val)) {
                        newArr = newArr.filter((item) => item !== val);
                    }
                    else {
                        newArr.push(val);
                    }
                });
            }
            else {
                newArr = value;
            }
            if (newArr.length === 0) {
                delete updatedFilters[filterType];
            }
            else {
                updatedFilters[filterType] = newArr as any;
            }
        }
        else {
            updatedFilters[filterType] = value as any;
        }

        localFiltersRef.current = updatedFilters;
    };

    const handleOnSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        onFilterApply(localFiltersRef.current);
        handleSheetOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={handleSheetOpenChange}>
            <SheetContent className="max-sm:w-full" side="right">
                <SheetHeader>
                    <SheetTitle>Additional Filters</SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                        How filters works <FilterInfoPopover/>
                    </SheetDescription>
                </SheetHeader>

                <form id="filters-form" onSubmit={handleOnSubmit} className="overflow-y-auto px-4">
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
                                    <CheckboxGroup
                                        title="Genres"
                                        items={listFilters?.genres ?? []}
                                        onChange={(genre) => handleRegisterChange("genres", [genre])}
                                        defaultChecked={(genre) => filters.genres?.includes(genre) ?? false}
                                    />
                                    {activeFiltersConfig.map((filter) => {
                                        if (filter.type === "checkbox" && filter.getItems) {
                                            const items = filter.getItems(listFilters || {} as any);
                                            if (!items || items.length === 0) return null;

                                            return (
                                                <CheckboxGroup
                                                    items={items}
                                                    key={filter.key}
                                                    title={filter.title}
                                                    onChange={(val) => handleRegisterChange(filter.key, [val])}
                                                    render={(name) => filter.render ? filter.render(name, mediaType) : name}
                                                    defaultChecked={(val) => (filters as any)?.[filter.key]?.includes(val) ?? false}
                                                />
                                            );
                                        }
                                        if (filter.type === "search") {
                                            return (
                                                <SearchFilter
                                                    key={filter.key}
                                                    job={filter.job!}
                                                    username={username}
                                                    title={filter.title}
                                                    mediaType={mediaType}
                                                    filterKey={filter.key}
                                                    dataList={(filters as any)?.[filter.key] ?? []}
                                                    registerChange={(key, val) => handleRegisterChange(key, val)}
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
                                            <Field orientation="horizontal">
                                                <Checkbox
                                                    id={`${fieldId}-fav`}
                                                    defaultChecked={filters.favorite}
                                                    onCheckedChange={(checked) => handleRegisterChange("favorite", checked)}
                                                />
                                                <FieldLabel htmlFor={`${fieldId}-fav`} className="cursor-pointer font-normal">
                                                    Favorites
                                                </FieldLabel>
                                            </Field>
                                            <Field orientation="horizontal">
                                                <Checkbox
                                                    id={`${fieldId}-comment`}
                                                    defaultChecked={filters.comment}
                                                    onCheckedChange={(checked) => handleRegisterChange("comment", checked)}
                                                />
                                                <FieldLabel htmlFor={`${fieldId}-comment`} className="cursor-pointer font-normal">
                                                    Comments
                                                </FieldLabel>
                                            </Field>
                                            {!isCurrent &&
                                                <Field orientation="horizontal">
                                                    <Checkbox
                                                        id={`${fieldId}-hc`}
                                                        defaultChecked={filters?.hideCommon ?? false}
                                                        onCheckedChange={(checked) => handleRegisterChange("hideCommon", checked)}
                                                    />
                                                    <FieldLabel htmlFor={`${fieldId}-hc`} className="cursor-pointer font-normal">
                                                        Hide Common
                                                    </FieldLabel>
                                                </Field>
                                            }
                                        </FieldGroup>
                                    </FieldSet>
                                    <CheckboxGroup
                                        title="Tags"
                                        items={listFilters?.tags ?? []}
                                        onChange={(col) => handleRegisterChange("tags", [col])}
                                        defaultChecked={(col) => filters.tags?.includes(col) ?? false}
                                    />
                                </FieldGroup>
                        }
                    </FieldSet>
                </form>

                <SheetFooter>
                    <FormSubmitButton form="filters-form" className="w-full" disabled={!!error} isLoading={isPending}>
                        Apply Filters
                    </FormSubmitButton>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};


interface CheckboxGroupProps {
    title: string;
    render?: (name: string) => string;
    items: { name: string }[] | { name: GamesPlatformsEnum }[];
    onChange: (v: string | Status | GamesPlatformsEnum) => void;
    defaultChecked: (v: string | Status | GamesPlatformsEnum) => boolean;
}


const CheckboxGroup = ({ title, items, onChange, defaultChecked, render }: CheckboxGroupProps) => {
    const fieldId = useId();
    const initVisibleItems = 14;
    const [showAll, setShowAll] = useState(false);
    const visibleItems = showAll ? items : items.slice(0, initVisibleItems);

    const toggleShowAll = (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        setShowAll(!showAll);
    };

    return (
        <FieldSet>
            <FieldLegend variant="label">
                {title}
            </FieldLegend>
            <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
                {visibleItems.length === 0 ?
                    <div className="text-muted-foreground text-sm">
                        Nothing to display.
                    </div>
                    :
                    visibleItems.map((item, idx) =>
                        <Field key={item.name} orientation="horizontal">
                            <Checkbox
                                id={`${fieldId}-${idx}`}
                                defaultChecked={defaultChecked?.(item.name)}
                                onCheckedChange={() => onChange(item.name)}
                            />
                            <FieldLabel htmlFor={`${fieldId}-${idx}`} className="line-clamp-1 cursor-pointer font-normal">
                                {render ? render(item.name) : item.name}
                            </FieldLabel>
                        </Field>
                    )
                }
            </FieldGroup>
            {items.length > initVisibleItems &&
                <Button size="xs" variant="outline" onClick={toggleShowAll} className="w-fit">
                    {showAll
                        ? <>Less <ChevronUp/></>
                        : <>More <ChevronDown/></>
                    }
                </Button>
            }
        </FieldSet>
    );
};


const FilterInfoPopover = () => (
    <Popover>
        <PopoverTrigger>
            <CircleHelp className="size-4 cursor-help opacity-70 hover:opacity-100"/>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-3 text-sm">
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
        </PopoverContent>
    </Popover>
);


interface SearchFilterProps {
    job: JobType;
    title: string;
    username: string;
    dataList: string[];
    mediaType: MediaType;
    filterKey: keyof MediaListArgs;
    registerChange: (filterType: keyof MediaListArgs, value: string[]) => void;
}


const SearchFilter = ({ mediaType, username, filterKey, job, title, dataList, registerChange }: SearchFilterProps) => {
    const fieldId = useId();
    const [selectedData, setSelectedData] = useState(dataList ?? []);
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer();
    const { data: filterResults, isPending, error } = useQuery(filterSearchOptions(mediaType, username, debouncedSearch, job));

    const handleSearchClick = (data: string) => {
        reset();
        if (selectedData.includes(data)) return;
        registerChange(filterKey, [data]);
        setSelectedData((prev) => [...prev, data]);
    };

    const handleRemoveData = (data: string) => {
        registerChange(filterKey, [data]);
        setSelectedData(selectedData.filter((d) => d !== data));
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
                {selectedData.map(item =>
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
