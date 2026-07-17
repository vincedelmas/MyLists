import React, {useRef, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ChevronDown, ChevronUp, CircleHelp, LoaderCircle, X} from "lucide-react";
import type {MediaListArgs} from "@/lib/schemas";
import type {MediaListFiltersResult} from "@/lib/contracts/media/lists";
import {GamesPlatformsEnum, JobType, MediaType} from "@/lib/utils/enums";
import {formatLocaleName} from "@/lib/utils/text-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {filterSearchOptions, listFiltersOptions} from "@/lib/client/react-query/query-options";
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";
import {assertNever} from "@/lib/utils/assert-never";


interface FiltersSideSheetProps {
    username: string;
    isCurrent: boolean;
    onClose: () => void;
    mediaType: MediaType;
    filters: MediaListArgs;
    onFilterApply: (filters: Partial<MediaListArgs>) => void;
}

type SupplementalFilterChange =
    | { key: "genres" | "tags" | "langs" | "actors" | "networks" | "creators" | "directors" | "companies" | "authors" | "publishers"; value: string }
    | { key: "platforms"; value: GamesPlatformsEnum };


export const FiltersSideSheet = ({ filters, username, mediaType, isCurrent, onClose, onFilterApply }: FiltersSideSheetProps) => {
    const localFiltersRef = useRef<Partial<MediaListArgs>>({});
    const { data: listFilters, isPending, error } = useQuery(listFiltersOptions(mediaType, username));

    const handleRegisterChange = (change: SupplementalFilterChange) => {
        const pending = localFiltersRef.current;

        switch (change.key) {
            case "genres":
                localFiltersRef.current = { ...pending, genres: togglePendingValue(pending.genres, change.value) };
                break;
            case "tags":
                localFiltersRef.current = { ...pending, tags: togglePendingValue(pending.tags, change.value) };
                break;
            case "langs":
                localFiltersRef.current = { ...pending, langs: togglePendingValue(pending.langs, change.value) };
                break;
            case "actors":
                localFiltersRef.current = { ...pending, actors: togglePendingValue(pending.actors, change.value) };
                break;
            case "networks":
                localFiltersRef.current = { ...pending, networks: togglePendingValue(pending.networks, change.value) };
                break;
            case "creators":
                localFiltersRef.current = { ...pending, creators: togglePendingValue(pending.creators, change.value) };
                break;
            case "directors":
                localFiltersRef.current = { ...pending, directors: togglePendingValue(pending.directors, change.value) };
                break;
            case "companies":
                localFiltersRef.current = { ...pending, companies: togglePendingValue(pending.companies, change.value) };
                break;
            case "authors":
                localFiltersRef.current = { ...pending, authors: togglePendingValue(pending.authors, change.value) };
                break;
            case "publishers":
                localFiltersRef.current = { ...pending, publishers: togglePendingValue(pending.publishers, change.value) };
                break;
            case "platforms":
                localFiltersRef.current = { ...pending, platforms: togglePendingValue(pending.platforms, change.value) };
                break;
            default:
                assertNever(change, "supplemental filter");
        }
    };

    const handleBooleanChange = (key: "favorite" | "comment" | "hideCommon", value: boolean) => {
        const pending = localFiltersRef.current;
        if (key === "favorite") localFiltersRef.current = { ...pending, favorite: value };
        if (key === "comment") localFiltersRef.current = { ...pending, comment: value };
        if (key === "hideCommon") localFiltersRef.current = { ...pending, hideCommon: value };
    };

    const handleOnSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        onClose();
        onFilterApply(localFiltersRef.current);
    };

    return (
        <Sheet defaultOpen onOpenChange={onClose}>
            <SheetContent className="max-sm:w-full" side="right">
                <SheetHeader>
                    <SheetTitle>Additional Filters</SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                        How filters work <FilterInfoPopover/>
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    <form id="filters-form" onSubmit={handleOnSubmit} className="space-y-6">
                        <fieldset disabled={isPending} className="space-y-6">
                            {error ?
                                <div className="flex items-center justify-center h-[70vh]">
                                    <EmptyState icon={X} message={error.message} className="text-destructive"/>
                                </div>
                                : isPending ?
                                    <div className="flex items-center justify-center h-[70vh]">
                                        <LoaderCircle className="size-10 animate-spin"/>
                                    </div>
                                    : listFilters &&
                                        <div className="pl-4 space-y-6">
                                            <CheckboxGroup
                                                title="Genres"
                                                items={listFilters.genres}
                                                onChange={(value) => handleRegisterChange({ key: "genres", value })}
                                                defaultChecked={(value) => filters.genres?.includes(value) ?? false}
                                            />
                                            <FamilyFilters
                                                data={listFilters}
                                                filters={filters}
                                                username={username}
                                                onChange={handleRegisterChange}
                                            />
                                            <MiscellaneousFilters
                                                filters={filters}
                                                isCurrent={isCurrent}
                                                onChange={handleBooleanChange}
                                            />
                                            <CheckboxGroup
                                                title="Tags"
                                                items={listFilters.tags}
                                                onChange={(value) => handleRegisterChange({ key: "tags", value })}
                                                defaultChecked={(value) => filters.tags?.includes(value) ?? false}
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


const togglePendingValue = <T extends string>(values: T[] | undefined, value: T): T[] | undefined => {
    if (!values) return [value];
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    return next.length > 0 ? next : undefined;
};


interface FamilyFiltersProps {
    data: MediaListFiltersResult;
    filters: MediaListArgs;
    username: string;
    onChange: (change: SupplementalFilterChange) => void;
}


const FamilyFilters = ({ data, filters, username, onChange }: FamilyFiltersProps) => {
    switch (data.kind) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return (
                <>
                    <SearchFilter title="Actors" job={JobType.ACTOR} username={username} mediaType={data.kind}
                        dataList={filters.actors ?? []} onToggle={(value) => onChange({ key: "actors", value })}/>
                    <SearchFilter title="Creators" job={JobType.CREATOR} username={username} mediaType={data.kind}
                        dataList={filters.creators ?? []} onToggle={(value) => onChange({ key: "creators", value })}/>
                    <SearchFilter title="Networks" job={JobType.PLATFORM} username={username} mediaType={data.kind}
                        dataList={filters.networks ?? []} onToggle={(value) => onChange({ key: "networks", value })}/>
                    <CheckboxGroup
                        title="Countries"
                        items={data.langs}
                        render={(name) => formatLocaleName(name, "region")}
                        onChange={(value) => onChange({ key: "langs", value })}
                        defaultChecked={(value) => filters.langs?.includes(value) ?? false}
                    />
                </>
            );
        case MediaType.MOVIES:
            return (
                <>
                    <SearchFilter title="Actors" job={JobType.ACTOR} username={username} mediaType={MediaType.MOVIES}
                        dataList={filters.actors ?? []} onToggle={(value) => onChange({ key: "actors", value })}/>
                    <SearchFilter title="Directors" job={JobType.CREATOR} username={username} mediaType={MediaType.MOVIES}
                        dataList={filters.directors ?? []} onToggle={(value) => onChange({ key: "directors", value })}/>
                    <CheckboxGroup
                        title="Languages"
                        items={data.langs}
                        render={(name) => formatLocaleName(name, "language")}
                        onChange={(value) => onChange({ key: "langs", value })}
                        defaultChecked={(value) => filters.langs?.includes(value) ?? false}
                    />
                </>
            );
        case MediaType.GAMES:
            return (
                <>
                    <SearchFilter title="Companies" job={JobType.CREATOR} username={username} mediaType={MediaType.GAMES}
                        dataList={filters.companies ?? []} onToggle={(value) => onChange({ key: "companies", value })}/>
                    <CheckboxGroup
                        title="Platforms"
                        items={data.platforms}
                        onChange={(value) => onChange({ key: "platforms", value })}
                        defaultChecked={(value) => filters.platforms?.includes(value) ?? false}
                    />
                </>
            );
        case MediaType.BOOKS:
            return (
                <>
                    <SearchFilter title="Authors" job={JobType.CREATOR} username={username} mediaType={MediaType.BOOKS}
                        dataList={filters.authors ?? []} onToggle={(value) => onChange({ key: "authors", value })}/>
                    <CheckboxGroup
                        title="Languages"
                        items={data.langs}
                        render={(name) => formatLocaleName(name, "language")}
                        onChange={(value) => onChange({ key: "langs", value })}
                        defaultChecked={(value) => filters.langs?.includes(value) ?? false}
                    />
                </>
            );
        case MediaType.MANGA:
            return (
                <>
                    <SearchFilter title="Authors" job={JobType.CREATOR} username={username} mediaType={MediaType.MANGA}
                        dataList={filters.authors ?? []} onToggle={(value) => onChange({ key: "authors", value })}/>
                    <SearchFilter title="Publishers" job={JobType.PUBLISHER} username={username} mediaType={MediaType.MANGA}
                        dataList={filters.publishers ?? []} onToggle={(value) => onChange({ key: "publishers", value })}/>
                </>
            );
        default:
            return assertNever(data, "filter family");
    }
};


interface MiscellaneousFiltersProps {
    filters: MediaListArgs;
    isCurrent: boolean;
    onChange: (key: "favorite" | "comment" | "hideCommon", value: boolean) => void;
}


const MiscellaneousFilters = ({ filters, isCurrent, onChange }: MiscellaneousFiltersProps) => (
    <div className="space-y-2">
        <h3 className="font-medium">Miscellaneous</h3>
        <div className="grid grid-cols-2 gap-2">
            <FilterCheckbox id="favoriteCheck" label="Favorites" checked={filters.favorite}
                onChange={(checked) => onChange("favorite", checked)}/>
            <FilterCheckbox id="commentCheck" label="Comments" checked={filters.comment}
                onChange={(checked) => onChange("comment", checked)}/>
            {!isCurrent &&
                <FilterCheckbox id="commonCheck" label="Hide Common" checked={filters.hideCommon}
                    onChange={(checked) => onChange("hideCommon", checked)}/>
            }
        </div>
    </div>
);


interface FilterCheckboxProps {
    id: string;
    label: string;
    checked?: boolean;
    onChange: (checked: boolean) => void;
}


const FilterCheckbox = ({ id, label, checked, onChange }: FilterCheckboxProps) => (
    <div className="flex items-center space-x-2">
        <Checkbox id={id} defaultChecked={checked} onCheckedChange={(value) => onChange(!!value)}/>
        <label htmlFor={id} className="text-sm cursor-pointer">{label}</label>
    </div>
);


interface CheckboxGroupProps<T extends string> {
    title: string;
    render?: (name: T) => string;
    items: { name: T }[];
    onChange: (value: T) => void;
    defaultChecked: (value: T) => boolean;
}


const CheckboxGroup = <T extends string,>({ title, items, onChange, defaultChecked, render }: CheckboxGroupProps<T>) => {
    const initVisibleItems = 14;
    const [showAll, setShowAll] = useState(false);
    const visibleItems = showAll ? items : items.slice(0, initVisibleItems);

    return (
        <div className="space-y-2">
            <h3 className="font-medium">{title}</h3>
            <div className="grid grid-cols-2 gap-2">
                {visibleItems.length === 0 ?
                    <div className="text-muted-foreground text-sm">Nothing to display.</div>
                    : visibleItems.map((item) =>
                        <div key={item.name} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${item.name}-id`}
                                defaultChecked={defaultChecked(item.name)}
                                onCheckedChange={() => onChange(item.name)}
                            />
                            <label htmlFor={`${item.name}-id`} className="text-sm cursor-pointer line-clamp-1">
                                {render ? render(item.name) : item.name}
                            </label>
                        </div>
                    )
                }
            </div>
            {items.length > initVisibleItems &&
                <Button type="button" variant="outline" size="xs" onClick={() => setShowAll((value) => !value)} className="mt-1">
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
        <PopoverTrigger><CircleHelp className="w-4 h-4"/></PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                    <div className="size-2 rounded-full bg-gray-400 mt-1.5 shrink-0"/>
                    <div>
                        <span className="font-medium text-cyan-500">Same category filters: </span>
                        Results include media matching <i>any</i> selected filter.
                        <div>(Filter A <strong>OR</strong> Filter B)</div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="size-2 rounded-full bg-gray-400 mt-1.5 shrink-0"/>
                    <div>
                        <span className="font-medium text-amber-500">Different category filters: </span>
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
    onToggle: (value: string) => void;
}


const SearchFilter = ({ mediaType, username, job, title, dataList, onToggle }: SearchFilterProps) => {
    const [selectedData, setSelectedData] = useState(dataList);
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer();
    const { data: filterResults, isPending, error } = useQuery(filterSearchOptions(mediaType, username, debouncedSearch, job));

    const handleSearchClick = (data: string) => {
        reset();
        if (selectedData.includes(data)) return;
        onToggle(data);
        setSelectedData((prev) => [...prev, data]);
    };

    const handleRemoveData = (data: string) => {
        onToggle(data);
        setSelectedData((prev) => prev.filter((item) => item !== data));
    };

    return (
        <div>
            <h3 className="font-medium">{title}</h3>
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
                                type="button"
                                key={item.name}
                                onClick={() => handleSearchClick(item.name)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors"
                            >
                                <ProfileIcon fallbackSize="text-xs" className="size-9 border" user={{ image: null, name: item.name }}/>
                                <span className="text-left">{item.name}</span>
                            </button>
                        )}
                    </div>
                </SearchContainer>
            </div>
            <div className="flex flex-wrap gap-2">
                {selectedData.map((item) =>
                    <Badge key={item} className="mt-2 bg-neutral-800 h-8 px-4 text-sm gap-2" variant="outline">
                        {item}
                        <Button type="button" size="iconBare" variant="invisible" className="hover:opacity-80 -mr-1"
                            onClick={() => handleRemoveData(item)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </Badge>
                )}
            </div>
        </div>
    );
};
