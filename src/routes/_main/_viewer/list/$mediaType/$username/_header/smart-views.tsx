import {Layers3, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {SmartViewCard} from "@/lib/client/components/smart-views/SmartViewCard";
import {userSmartViewsOptions} from "@/lib/client/react-query/query-options/smart-views.options";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/smart-views")({
    context: ({ params: { username } }) => ({
        userSmartViewsQueryOptions: userSmartViewsOptions(username),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.userSmartViewsQueryOptions);
    },
    component: SmartListsTab,
});


function SmartListsTab() {
    const { currentUser } = useAuth();
    const { mediaType, username } = Route.useParams();
    const { userSmartViewsQueryOptions } = Route.useRouteContext();
    const smartViews = useSuspenseQuery(userSmartViewsQueryOptions);

    if (smartViews.isError) {
        throw smartViews.error;
    }

    const isOwner = currentUser?.name === username;
    const views = smartViews.data.filter(view => view.preview.mediaTypes.includes(mediaType));

    return (
        <section className="flex min-w-0 flex-col gap-6" aria-labelledby="smart-lists-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 id="smart-lists-title" className="text-xl font-semibold tracking-tight">
                        {isOwner ? "Your" : `${username}'s`} Smart lists
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Smart lists with {mediaType}, built from {isOwner ? "your" : `${username}'s`} tracking lists.
                    </p>
                </div>
                {isOwner &&
                    <Link to="/smart-views/create" className={buttonVariants({ className: "whitespace-nowrap" })}>
                        <Plus data-icon="inline-start"/> Create list
                    </Link>
                }
            </div>

            {views.length > 0 ?
                <div className="flex min-w-0 flex-col gap-3">
                    {views.map(view =>
                        <SmartViewCard
                            view={view}
                            key={view.id}
                            isOwner={isOwner}
                            preview={view.preview}
                        />
                    )}
                </div>
                :
                <Empty className="border py-14">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><Layers3/></EmptyMedia>
                        <EmptyTitle>No smart lists here yet</EmptyTitle>
                        <EmptyDescription>
                            {isOwner
                                ? `Your smart lists appear here when their rules match titles in your ${mediaType} list.`
                                : `${username} has no smart lists with matching ${mediaType}.`
                            }
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            }
        </section>
    );
}
