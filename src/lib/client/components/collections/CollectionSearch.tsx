import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {Separator} from "@/lib/client/components/ui/separator";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {MediaSearchResult} from "@/lib/client/components/media/base/MediaSearchResult";
import {useAddMediaToCollectionMutation} from "@/lib/client/react-query/query-mutations/media.mutations";


interface CollectionSearchProps {
    disabled?: boolean;
    mediaType: MediaType;
    onAdd: (item: {
        mediaId: number;
        mediaName: string;
        mediaCover: string;
    }) => void;
}


export const CollectionSearch = ({ mediaType, onAdd, disabled }: CollectionSearchProps) => {
    const [page, setPage] = useState(1);
    const apiProvider = providerByMediaType[mediaType];
    const mutation = useAddMediaToCollectionMutation();
    const [resolvingId, setResolvingId] = useState<number | string | null>(null);
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer({
        onReset: () => setPage(1),
    });
    const { data: searchResults, isFetching, error } = useQuery(navSearchOptions(debouncedSearch, page, apiProvider));

    const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setSearch(ev.target.value);
    };

    const handleAdd = (item: ProviderSearchResult) => {
        if (disabled || resolvingId) return;

        setResolvingId(item.id)

        mutation.mutate({ data: { mediaType, apiId: item.id } }, {
            onSuccess: ({ mediaId }) => {
                onAdd({ mediaId, mediaName: item.name, mediaCover: item.image });
                reset();
            },
            onSettled: () => setResolvingId(null),
        });
    };

    return (
        <div ref={containerRef} className="relative">
            <SearchInput
                value={search}
                disabled={disabled}
                onChange={handleInputChange}
                placeholder={`Search ${capitalize(mediaType)}...`}
            />

            <SearchContainer
                error={error}
                search={search}
                isOpen={isOpen}
                isPending={isFetching}
                debouncedSearch={debouncedSearch}
                hasResults={!!searchResults?.data.length}
            >
                <div className="flex flex-col overflow-y-auto scrollbar-thin max-h-91">
                    {searchResults?.data.map((item) =>
                        <div key={item.id}>
                            <button
                                type="button"
                                disabled={resolvingId === item.id}
                                onClick={() => handleAdd(item)}
                                className="w-full text-left"
                            >
                                <MediaSearchResult item={item} isPending={resolvingId === item.id}/>
                            </button>
                            <Separator className="m-0"/>
                        </div>
                    )}
                    {searchResults && searchResults.data.length > 0 &&
                        <div className="flex justify-end items-center p-3">
                            <ButtonGroup aria-label="Collection search result pages">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page === 1}
                                    aria-label="Previous collection search result page"
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    <ChevronLeft/> Prev.
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!searchResults?.hasNextPage}
                                    aria-label="Next collection search result page"
                                    onClick={() => setPage((p) => p + 1)}
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


const providerByMediaType: Record<MediaType, ApiProviderType> = {
    [MediaType.SERIES]: ApiProviderType.TMDB,
    [MediaType.ANIME]: ApiProviderType.TMDB,
    [MediaType.MOVIES]: ApiProviderType.TMDB,
    [MediaType.GAMES]: ApiProviderType.IGDB,
    [MediaType.BOOKS]: ApiProviderType.BOOKS,
    [MediaType.MANGA]: ApiProviderType.MANGA,
};
