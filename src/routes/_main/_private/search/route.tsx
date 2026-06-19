import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Card} from "@/lib/client/components/ui/card";
import {formatDate} from "@/lib/utils/date-formatting";
import {Input} from "@/lib/client/components/ui/input";
import {Badge} from "@/lib/client/components/ui/badge";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {createFileRoute, Link} from "@tanstack/react-router";
import {GlobalSearch, globalSearchSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {BookImage, Cat, Gamepad2, Library, LoaderCircle, Monitor, Popcorn, Search, User, X} from "lucide-react";


export const Route = createFileRoute("/_main/_private/search")({
    validateSearch: globalSearchSchema,
    component: SearchPage,
});


function SearchPage() {
    const { currentUser } = useAuth();
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { query = "", apiProvider = ApiProviderType.TMDB } = filters;

    const [selectDrop, setSelectDrop] = useState(apiProvider);
    const [currentSearch, setCurrentSearch] = useState(query);
    const { data: apiData, isLoading, error } = useQuery(navSearchOptions(query, 1, apiProvider));

    const fetchData = async (params: GlobalSearch) => {
        await navigate({ search: params });
    };

    const onSearchEnter = async (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key !== "Enter") return;

        if (currentSearch === "") {
            setCurrentSearch("");
        }

        setCurrentSearch(currentSearch);
        await fetchData({ query: currentSearch, apiProvider: selectDrop });
    }

    const onTypeChanged = async (value: ApiProviderType) => {
        setSelectDrop(value);
    };

    return (
        <PageTitle title="Search" subtitle="Search for movies, TV shows, users, and more.">
            <div className="flex justify-center items-center gap-3 mt-3 mb-6">
                <div className="relative max-sm:w-full">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground size-4"/>
                    <Input
                        type="search"
                        value={currentSearch}
                        placeholder="Search for media/users..."
                        className="pl-8 rounded-md w-md max-sm:w-full"
                        onKeyDown={(ev) => onSearchEnter(ev)}
                        onChange={(ev) => setCurrentSearch(ev.target.value)}
                    />
                </div>
                <Select value={selectDrop} onValueChange={(value: ApiProviderType) => onTypeChanged(value)}>
                    <SelectTrigger className="w-30">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ApiProviderType.TMDB}>Media</SelectItem>
                        {currentUser?.settings?.find(s => s.mediaType === MediaType.BOOKS)?.active &&
                            <SelectItem value={ApiProviderType.BOOKS}>Books</SelectItem>
                        }
                        {currentUser?.settings?.find(s => s.mediaType === MediaType.GAMES)?.active &&
                            <SelectItem value={ApiProviderType.IGDB}>Games</SelectItem>
                        }
                        {currentUser?.settings?.find(s => s.mediaType === MediaType.MANGA)?.active &&
                            <SelectItem value={ApiProviderType.MANGA}>Manga</SelectItem>
                        }
                        <SelectItem value={ApiProviderType.USERS}>Users</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading &&
                <div className="flex items-center justify-center p-3.5">
                    <LoaderCircle className="size-8 animate-spin"/>
                </div>
            }

            {apiData && apiData.data.length > 0 &&
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-semibold text-foreground">
                            Search Results
                        </h2>
                        <Badge variant="secondary" className="text-base px-3">
                            {apiData.data.length} Results
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:gap-4 lg:grid-cols-5 sm:gap-5">
                        {apiData.data.map((item) =>
                            <Card key={item.id} className="rounded-lg py-0 border-none">
                                <div className="relative aspect-2/3 h-full rounded-lg border border-black">
                                    {item.itemType === ApiProviderType.USERS ?
                                        <Link to="/profile/$username" params={{ username: item.name }}>
                                            <img
                                                alt={item.name}
                                                src={item.image}
                                                className="object-cover w-full h-full rounded-lg"
                                            />
                                        </Link>
                                        :
                                        <Link
                                            to="/details/$mediaType/external/$apiId"
                                            params={{ mediaType: item.itemType as MediaType, apiId: item.id.toString() }}
                                        >
                                            <img
                                                alt={item.name}
                                                src={item.image}
                                                className="object-cover w-full h-full rounded-lg"
                                            />
                                        </Link>
                                    }
                                    <div className="absolute bottom-0 px-4 pt-2 pb-2 space-y-1 bg-gray-900 w-full rounded-b-sm text-center">
                                        <div className="truncate">{item.name}</div>
                                        <div>{formatDate(item.date)}</div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            }

            {apiData && apiData.data.length === 0 &&
                <div className="text-center py-12">
                    <div className="text-muted-foreground">
                        <Search className="size-10 mx-auto opacity-70"/>
                        <p className="text-lg font-medium">No results found</p>
                        <p>Try adjusting your search query or selecting a different provider</p>
                    </div>
                </div>
            }

            {!query && !apiData &&
                <div className="text-center py-10">
                    <div className="text-muted-foreground mb-8">
                        <div className="flex justify-center gap-4 mb-6">
                            <Popcorn className="size-8 opacity-70"/>
                            <Monitor className="size-8 opacity-70"/>
                            <Cat className="size-8 opacity-70"/>
                            <Gamepad2 className="size-8 opacity-70"/>
                            <Library className="size-8 opacity-70"/>
                            <BookImage className="size-8 opacity-70"/>
                            <User className="size-8 opacity-70"/>
                        </div>
                        <p className="text-xl font-medium">Ready to search</p>
                        <p>Enter your query to get started!</p>
                    </div>
                </div>
            }

            {error &&
                <div className="text-center py-12">
                    <div className="text-muted-foreground">
                        <X className="size-10 mx-auto opacity-70"/>
                        <p className="text-lg font-medium">An Error Occurred</p>
                        <p>{error.message}</p>
                    </div>
                </div>
            }
        </PageTitle>
    );
}
