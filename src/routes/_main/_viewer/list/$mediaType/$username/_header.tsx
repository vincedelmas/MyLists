import {useAuth} from "@/lib/client/hooks/use-auth";
import {mediaTypeUsernameSchema} from "@/lib/schemas";
import {capitalize} from "@/lib/utils/text-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {THEME_ICONS_MAP} from "@/lib/utils/theme-utils";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {MediaLevel} from "@/lib/client/components/general/MediaLevel";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {userListHeaderOption} from "@/lib/client/react-query/query-options";
import {Award, ChartNoAxesColumn, Library, ListOrdered, Tags, Zap} from "lucide-react";
import {createFileRoute, Link, linkOptions, Outlet, useLocation} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header")({
    params: {
        parse: (params) => {
            const result = mediaTypeUsernameSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    context: ({ params: { mediaType, username } }) => ({
        userListHeaderQueryOptions: userListHeaderOption(mediaType, username),
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.userListHeaderQueryOptions),
    component: ListHeader,
});


function ListHeader() {
    const location = useLocation();
    const { currentUser } = useAuth();
    const { username, mediaType } = Route.useParams();
    const { userListHeaderQueryOptions } = Route.useRouteContext();
    const { timeSpent } = useSuspenseQuery(userListHeaderQueryOptions).data;

    const MediaIcon = THEME_ICONS_MAP[mediaType];
    const isOwner = currentUser?.name === username;

    const activeTab = location.pathname.endsWith("/tags")
        ? "tags" : location.pathname.endsWith("/collections")
            ? "collections" : location.pathname.endsWith("/stats")
                ? "stats" : location.pathname.endsWith("/achievements")
                    ? "achievements" : location.pathname.endsWith("/activity")
                        ? "activity" : "list";

    const currentDate = new Date();
    const params = { mediaType, username };
    const hasFlushContent = activeTab === "stats" || activeTab === "achievements" || activeTab === "activity";

    const tabs = [
        {
            id: "list",
            label: "List",
            isAccent: true,
            icon: <Library className="size-4"/>,
            linkOptions: linkOptions({ params, to: "/list/$mediaType/$username" }),
        }, {
            isAccent: true,
            id: "tags",
            label: "Tags",
            icon: <Tags className="size-4"/>,
            linkOptions: linkOptions({ params, to: "/list/$mediaType/$username/tags" }),
        }, {
            id: "stats",
            label: "stats",
            isAccent: true,
            icon: <ChartNoAxesColumn className="size-4"/>,
            linkOptions: linkOptions({ params, to: "/list/$mediaType/$username/stats" }),
        }, {
            isAccent: true,
            id: "collections",
            label: "collections",
            icon: <ListOrdered className="size-4"/>,
            linkOptions: linkOptions({ params, to: "/list/$mediaType/$username/collections" }),
        }, {
            isAccent: true,
            id: "achievements",
            label: "achievements",
            icon: <Award className="size-4"/>,
            linkOptions: linkOptions({ params, to: "/list/$mediaType/$username/achievements" }),
        }, {
            isAccent: true,
            id: "activity",
            label: "activity",
            icon: <Zap className="size-4"/>,
            linkOptions: linkOptions({
                params,
                to: "/list/$mediaType/$username/activity",
                search: {
                    year: String(currentDate.getFullYear()),
                    month: String(currentDate.getMonth() + 1),
                },
            }),
        },
    ] as const;

    return (
        <PageTitle title={`${username} ${capitalize(mediaType)} ${capitalize(activeTab)}`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    eyebrowIcon={MediaIcon}
                    eyebrow={`${capitalize(mediaType)} list`}
                    asideLabel={`${capitalize(mediaType)} level`}
                    title={isOwner ? `Your ${capitalize(mediaType)}` : `${username}'s ${capitalize(mediaType)}`}
                    description={isOwner
                        ? "Everything you have added here, with your progress, stats and collections."
                        : `Everything ${username} has added here, with their progress, stats and collections.`
                    }
                    asideValue={
                        <MediaLevel
                            className="text-lg"
                            mediaType={mediaType}
                            timeSpentMin={timeSpent}
                            containerClassName="mx-0"
                        />
                    }
                    navigation={
                        <TabHeader
                            tabs={tabs}
                            value={activeTab}
                            triggerClassName="max-sm:px-3"
                            trailing={<QuickActions username={username} mediaType={mediaType}/>}
                            renderTrigger={(tab, props) => <Link {...tab.linkOptions} {...props}/>}
                        />
                    }
                />

                <div className={hasFlushContent ? undefined : "pt-6"}>
                    <Outlet/>
                </div>
            </div>
        </PageTitle>
    );
}
