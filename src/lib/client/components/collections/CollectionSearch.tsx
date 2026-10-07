import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/formatting/text";
import {Button} from "@/lib/client/components/ui/button";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import type {DraftItem} from "@/lib/types/collections.types";
import {Separator} from "@/lib/client/components/ui/separator";
import {ChevronLeft, ChevronRight, SearchX} from "lucide-react";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import type {ProviderSearchResult} from "@/lib/types/provider.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {MediaSearchResult} from "@/lib/client/components/media/base/MediaSearchResult";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {useResolveExternalMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface CollectionSearchProps {
    disabled?: boolean;
    initialMediaType?: MediaType;
    onAdd: (item: DraftItem) => void;
}


export const CollectionSearch = ({ initialMediaType = MediaType.MOVIES, onAdd, disabled }: CollectionSearchProps) => {
    const [page, setPage] = useState(1);
    const mutation = useResolveExternalMediaMutation();
    const [mediaType, setMediaType] = useState(initialMediaType);
    const apiProvider = getMediaDefinition(mediaType).externalSearch!.provider;
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer({
        onReset: () => setPage(1),
    });

    const advancedFilters = apiProvider === ApiProviderType.TMDB
        ? {
            provider: ApiProviderType.TMDB,
            mediaType: mediaType === MediaType.MOVIES ? MediaType.MOVIES : MediaType.SERIES,
        } as const
        : undefined;

    const { data: searchResults, isFetching, error } = useQuery({
        ...navSearchOptions(debouncedSearch, page, apiProvider, advancedFilters),
        enabled: !disabled && debouncedSearch.trim().length >= 2,
    });

    const mediaTypeItems = createMediaSelectItems(ALL_MEDIA_TYPES);
    const visibleResults = searchResults?.data.filter(item => item.itemType === mediaType) ?? [];
    const hasResults = visibleResults.length > 0 || Boolean(searchResults?.hasNextPage) || page > 1;

    const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setSearch(ev.target.value);
    };

    const handleAdd = (item: ProviderSearchResult) => {
        if (disabled || mutation.isPending) return;

        mutation.mutate({ data: { mediaType, apiId: item.id } }, {
            onSuccess: ({ mediaId }) => {
                onAdd({ mediaId, mediaType, mediaName: item.name, mediaCover: item.image });
                reset();
            },
        });
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="flex items-center gap-3 max-sm:flex-col max-sm:items-stretch">
                <Select
                    value={mediaType}
                    items={mediaTypeItems}
                    disabled={disabled || mutation.isPending}
                    onValueChange={value => {
                        if (value === null) return;
                        reset();
                        setMediaType(value as MediaType);
                    }}
                >
                    <SelectTrigger className="w-40 shrink-0 max-sm:w-full" aria-label="Search media type">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {mediaTypeItems.map(item =>
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <SearchInput
                    value={search}
                    className="min-w-0 flex-1"
                    onChange={handleInputChange}
                    aria-label={`Search ${mediaType} to add`}
                    disabled={disabled || mutation.isPending}
                    placeholder={`Search ${capitalize(mediaType)}...`}
                />
            </div>

            <SearchContainer
                error={error}
                search={search}
                isOpen={isOpen}
                isPending={isFetching}
                hasResults={hasResults}
                debouncedSearch={debouncedSearch}
            >
                <div className="flex flex-col overflow-y-auto scrollbar-thin max-h-91">
                    {visibleResults.length === 0 &&
                        <EmptyState
                            icon={SearchX}
                            className="py-6"
                            message={`No ${mediaType} found on this page.`}
                        />
                    }
                    {visibleResults.map((item) =>
                        <div key={item.id}>
                            <button
                                type="button"
                                className="w-full text-left"
                                aria-label={`Add ${item.name}`}
                                onClick={() => handleAdd(item)}
                                disabled={disabled || mutation.isPending}
                            >
                                <MediaSearchResult
                                    item={item}
                                    isPending={mutation.isPending && mutation.variables.data.apiId === item.id}
                                />
                            </button>
                            <Separator className="m-0"/>
                        </div>
                    )}
                    {searchResults && hasResults &&
                        <div className="flex justify-end items-center p-3">
                            <ButtonGroup aria-label="Collection search result pages">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page === 1 || mutation.isPending}
                                    aria-label="Previous collection search result page"
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    <ChevronLeft/> Prev.
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPage((p) => p + 1)}
                                    aria-label="Next collection search result page"
                                    disabled={!searchResults.hasNextPage || mutation.isPending}
                                >
                                    Next <ChevronRight/>
                                </Button>
                            </ButtonGroup>
                        </div>
                    }
                </div>
            </SearchContainer>
        </div>
    );
};
