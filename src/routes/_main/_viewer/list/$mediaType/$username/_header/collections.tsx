import {ListOrdered, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {userCollectionsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/collections")({
    loader: ({ context: { queryClient }, params: { mediaType, username } }) => {
        return queryClient.ensureQueryData(userCollectionsOptions(username, mediaType));
    },
    component: CollectionsTab,
});


function CollectionsTab() {
    const { currentUser } = useAuth();
    const { mediaType, username } = Route.useParams();
    const collections = useSuspenseQuery(userCollectionsOptions(username, mediaType)).data;

    const isOwner = (currentUser?.name === username);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold">
                        Collections
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Curated {mediaType} collections by {isOwner ? "you" : username}.
                    </p>
                </div>
                {isOwner &&
                    <Button asChild>
                        <Route.Link to="/collections/create">
                            <Plus className="size-4"/>
                            New collection
                        </Route.Link>
                    </Button>
                }
            </div>
            {collections.length === 0 ?
                <EmptyState
                    className="py-20"
                    icon={ListOrdered}
                    message={isOwner ? "You have not created any collections yet." : "No collections yet."}
                />
                :
                <div className="grid gap-4 gap-y-7 grid-cols-3 max-sm:grid-cols-1">
                    {collections.map((collection) =>
                        <CollectionCard
                            showOwner={false}
                            key={collection.id}
                            collection={collection}
                        />
                    )}
                </div>
            }
        </div>
    );
}
