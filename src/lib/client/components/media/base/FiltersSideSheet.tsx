import {MediaListArgs} from "@/lib/schemas";
import React, {useRef, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {GamesPlatformsEnum, JobType, MediaType, Status} from "@/lib/utils/enums";
import {ChevronDown, ChevronUp, CircleHelp, LoaderCircle, X} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {filterSearchOptions, listFiltersOptions} from "@/lib/client/react-query/query-options";
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";


interface FiltersSideSheetProps {
    username: string;
    isCurrent: boolean;
    onClose: () => void;
    mediaType: MediaType;
    filters: MediaListArgs;
    onFilterApply: (filters: Partial<MediaListArgs>) => void;
}


export const FiltersSideSheet = ({ filters, username, mediaType, isCurrent, onClose, onFilterApply }: FiltersSideSheetProps) => {
    const localFiltersRef = useRef<Partial<MediaListArgs>>({});
    const { data: listFilters, isPending, error } = useQuery(listFiltersOptions(mediaType, username));

    const activeFiltersConfig = mediaConfig[mediaType].sheetFilters();

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

    const handleOnSubmit = async (ev: React.SubmitEvent<HTMLFormElement>) => {
        onClose();
        ev.preventDefault();
        onFilterApply(localFiltersRef.current);
    };

    return (
        <Sheet defaultOpen={true} onOpenChange={onClose}>
            <SheetContent className="max-sm:w-full" side="right">
                <SheetHeader>
                    <SheetTitle>Additional Filters</SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                        How filters works <FilterInfoPopover/>
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    <form id="filters-form" onSubmit={handleOnSubmit} className="space-y-6">
                        <fieldset disabled={isPending} className="space-y-6">
                            {error ?
                                <div className="flex items-center justify-center h-[70vh]">
                                    <EmptyState
                                        icon={X}
                                        message={error.message}
                                        className="text-destructive"
                                    />
                                </div>
                                :
                                isPending ?
                                    <div className="flex items-center justify-center h-[70vh]">
                                        <LoaderCircle className="size-10 animate-spin"/>
                                    </div>
                                    :
                                    <div className="pl-4 space-y-6">
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
                                                    <React.Fragment key={filter.key}>
                                                        <CheckboxGroup
                                                            items={items}
                                                            title={filter.title}
                                                            onChange={(val) => handleRegisterChange(filter.key, [val])}
                                                            render={(name) => filter.render ? filter.render(name, mediaType) : name}
                                                            defaultChecked={(val) => (filters as any)?.[filter.key]?.includes(val) ?? false}
                                                        />
                                                    </React.Fragment>
                                                );
                                            }
                                            if (filter.type === "search") {
                                                return (
                                                    <div key={filter.key} className="mb-4">
                                                        <SearchFilter
                                                            job={filter.job!}
                                                            username={username}
                                                            title={filter.title}
                                                            mediaType={mediaType}
                                                            filterKey={filter.key}
                                                            dataList={(filters as any)?.[filter.key] ?? []}
                                                            registerChange={(key, val) => handleRegisterChange(key, val)}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                        <div className="space-y-2">
                                            <h3 className="font-medium">
                                                Miscellaneous
                                            </h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="favoriteCheck"
                                                        defaultChecked={filters.favorite}
                                                        onCheckedChange={(checked) => handleRegisterChange("favorite", !!checked)}
                                                    />
                                                    <label htmlFor="favoriteCheck" className="text-sm cursor-pointer">
                                                        Favorites
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="commentCheck"
                                                        defaultChecked={filters.comment}
                                                        onCheckedChange={(checked) => handleRegisterChange("comment", !!checked)}
                                                    />
                                                    <label htmlFor="commentCheck" className="text-sm cursor-pointer">
                                                        Comments
                                                    </label>
                                                </div>
                                                {!isCurrent &&
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="commonCheck"
                                                            defaultChecked={filters?.hideCommon ?? false}
                                                            onCheckedChange={(checked) => handleRegisterChange("hideCommon", !!checked)}
                                                        />
                                                        <label htmlFor="commonCheck" className="text-sm cursor-pointer">
                                                            Hide Common
                                                        </label>
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                        <CheckboxGroup
                                            title="Tags"
                                            items={listFilters?.tags ?? []}
                                            onChange={(col) => handleRegisterChange("tags", [col])}
                                            defaultChecked={(col) => filters.tags?.includes(col) ?? false}
                                        />
                                    </div>
                            }
                        </fieldset>
                    </form>
                </div>
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
    const initVisibleItems = 14;
    const [showAll, setShowAll] = useState(false);
    const visibleItems = showAll ? items : items.slice(0, initVisibleItems);

    const toggleShowAll = (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        setShowAll(!showAll);
    };

    return (
        <div className="space-y-2">
            <h3 className="font-medium">
                {title}
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {visibleItems.length === 0 ?
                    <div className="text-muted-foreground text-sm">
                        Nothing to display.
                    </div>
                    :
                    visibleItems.map((item) =>
                        <div key={item.name} className="flex items-center space-x-2">
                            <Checkbox
                                id={item.name + "-id"}
                                defaultChecked={defaultChecked?.(item.name)}
                                onCheckedChange={() => onChange(item.name)}
                            />
                            <label htmlFor={item.name + "-id"} className="text-sm cursor-pointer line-clamp-1">
                                {render ? render(item.name) : item.name}
                            </label>
                        </div>
                    )
                }
            </div>
            {items.length > initVisibleItems &&
                <Button variant="outline" size="xs" onClick={toggleShowAll} className="mt-1">
                    {showAll
                        ? <>Less <ChevronUp className="size-3.5"/></>
                        : <>More <ChevronDown className="size-3.5"/></>
                    }
                </Button>
            }
        </div>
    );
};


const FilterInfoPopover = () => (
    <Popover>
        <PopoverTrigger>
            <CircleHelp className="w-4 h-4"/>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-3">
                <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                        <div className="size-2 rounded-full bg-gray-400 mt-1.5 shrink-0"/>
                        <div>
                            <span className="font-medium text-cyan-500">
                                Same category filters:{" "}
                            </span>
                            Results include media matching <i>any</i> selected filter.
                            <div>(Filter A <strong>OR</strong> Filter B)</div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="size-2 rounded-full bg-gray-400 mt-1.5 shrink-0"/>
                        <div>
                            <span className="font-medium text-amber-500">
                                Different category filters:{" "}
                            </span>
                            Results include media matching <i>all</i> selected filters.
                            <div>(Filter A <strong>AND</strong> Filter B)</div>
                        </div>
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
        <div>
            <h3 className="font-medium">
                {title}
            </h3>
            <div ref={containerRef} className="mt-1 relative">
                <SearchInput
                    value={search}
                    className="w-70"
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
                    <Badge key={item} className="mt-2 bg-neutral-800 h-8 px-4 text-sm gap-2" variant="outline">
                        {item}
                        <Button
                            type="button"
                            size="iconBare"
                            variant="invisible"
                            className="hover:opacity-80 -mr-1"
                            onClick={() => handleRemoveData(item)}
                        >
                            <X className="h-4 w-4"/>
                        </Button>
                    </Badge>
                )}
            </div>
        </div>
    );
};
