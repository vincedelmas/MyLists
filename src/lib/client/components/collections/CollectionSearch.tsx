import React, {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {useQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatDate} from "@/lib/utils/date-formatting";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {Separator} from "@/lib/client/components/ui/separator";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
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
                                disabled={resolvingId === item.id}
                                onClick={() => handleAdd(item)}
                                className="text-left w-full hover:bg-popover/70"
                            >
                                <div className="flex w-full gap-4 items-center p-3">
                                    <div className="relative shrink-0">
                                        <img
                                            loading="lazy"
                                            alt={item.name}
                                            src={item.image}
                                            className={cn("w-14 aspect-2/3 rounded-sm transition-opacity duration-200", resolvingId === item.id && "opacity-20")}
                                        />
                                        {resolvingId === item.id &&
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Spinner className="size-6"/>
                                            </div>
                                        }
                                    </div>
                                    <div className={cn("flex-1 min-w-0 transition-opacity duration-200", resolvingId === item.id && "opacity-40")}>
                                        <div className="font-semibold mb-1 line-clamp-2">
                                            {item.name}
                                        </div>
                                        <div className="text-foreground text-xs">
                                            {capitalize(item.itemType)}
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                            {formatDate(item.date)}
                                        </div>
                                    </div>
                                </div>
                            </button>
                            <Separator className="m-0"/>
                        </div>
                    )}
                    {searchResults && searchResults.data.length > 0 &&
                        <div className="flex justify-end gap-2 items-center p-3">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                <ChevronLeft/>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!searchResults?.hasNextPage}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                <ChevronRight/>
                            </Button>
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
