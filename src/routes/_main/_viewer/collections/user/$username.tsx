import {ListOrdered, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {userCollectionsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/collections/user/$username")({
    loader: ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(userCollectionsOptions(username));
    },
    component: UserCollectionsPage,
});


function UserCollectionsPage() {
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const isOwner = currentUser?.name === username;
    const collections = useSuspenseQuery(userCollectionsOptions(username)).data;

    return (
        <PageTitle
            title={`${username} Collections`}
            subtitle={isOwner ? "Manage every collection in one place." : `Collections created by ${username}.`}
        >
            <div className="space-y-6 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b">
                    {isOwner &&
                        <Button size="sm" variant="outline" className="mb-2" asChild>
                            <Route.Link to="/collections/create">
                                <Plus className="size-4"/> New collection
                            </Route.Link>
                        </Button>
                    }
                    <div className="ml-auto pr-2">
                        <QuickActions
                            username={username}
                        />
                    </div>
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
        </PageTitle>
    );
}
