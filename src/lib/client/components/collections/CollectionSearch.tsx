import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/formatting/text";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import type {DraftItem} from "@/lib/types/collections.types";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import type {ProviderSearchResult} from "@/lib/types/provider.types";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {SearchSelect} from "@/lib/client/components/general/SearchSelect";
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
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [mediaType, setMediaType] = useState(initialMediaType);
    const apiProvider = getMediaDefinition(mediaType).externalSearch!.provider;

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

    const handleSearchChange = (value: string) => {
        setPage(1);
        setSearch(value);
    };

    const handleAdd = async (item: ProviderSearchResult) => {
        const { mediaId } = await mutation.mutateAsync({ data: { mediaType, apiId: item.id } });
        onAdd({ mediaId, mediaType, mediaName: item.name, mediaCover: item.image });
    };

    return (
        <div className="flex items-center gap-3 max-sm:flex-col max-sm:items-stretch">
            <Select
                value={mediaType}
                items={mediaTypeItems}
                disabled={disabled || mutation.isPending}
                onValueChange={value => {
                    if (value === null) return;
                    handleSearchChange("");
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
            <SearchSelect
                error={error}
                search={search}
                disabled={disabled}
                onSelect={handleAdd}
                items={visibleResults}
                className="min-w-0 flex-1"
                getItemLabel={item => item.name}
                onSearchChange={handleSearchChange}
                getItemKey={item => String(item.id)}
                aria-label={`Search ${mediaType} to add`}
                placeholder={`Search ${capitalize(mediaType)}...`}
                isPending={isFetching || search !== debouncedSearch}
                emptyMessage={`No ${mediaType} found on this page.`}
                renderItem={item =>
                    <MediaSearchResult
                        item={item}
                        isPending={mutation.isPending && mutation.variables.data.apiId === item.id}
                    />
                }
                footer={searchResults && hasResults &&
                    <div className="flex justify-end">
                        <ButtonGroup aria-label="Collection search result pages">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page === 1 || mutation.isPending || isFetching}
                            >
                                <ChevronLeft/> Prev.
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!searchResults.hasNextPage || mutation.isPending || isFetching}
                            >
                                Next <ChevronRight/>
                            </Button>
                        </ButtonGroup>
                    </div>
                }
            />
        </div>
    );
};
