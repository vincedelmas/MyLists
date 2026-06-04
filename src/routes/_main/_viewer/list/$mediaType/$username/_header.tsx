import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {MediaLevel} from "@/lib/client/components/general/MediaLevel";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {createFileRoute, Outlet, useLocation} from "@tanstack/react-router";
import {userListHeaderOption} from "@/lib/client/react-query/query-options";
import {Award, ChartNoAxesColumn, Library, ListOrdered, Tags, User, Zap} from "lucide-react";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header")({
    params: {
        parse: (params) => {
            return {
                username: params.username,
                mediaType: params.mediaType as MediaType,
            }
        }
    },
    loader: async ({ context: { queryClient }, params: { mediaType, username } }) => {
        return queryClient.ensureQueryData(userListHeaderOption(mediaType, username));
    },
    component: ListHeader,
});


function ListHeader() {
    const location = useLocation();
    const navigate = Route.useNavigate();
    const { username, mediaType } = Route.useParams();
    const { timeSpent } = useSuspenseQuery(userListHeaderOption(mediaType, username)).data;

    const activeTab = location.pathname.endsWith("/tags")
        ? "tags" : location.pathname.endsWith("/collections")
            ? "collections" : location.pathname.endsWith("/stats")
                ? "stats" : location.pathname.endsWith("/achievements")
                    ? "achievements" : location.pathname.endsWith("/activity")
                        ? "activity" : "list";

    const onTabChange = (tabName: string) => {
        if (tabName === activeTab) return;

        if (tabName === "list") {
            return navigate({ to: `/list/${mediaType}/${username}` });
        }
        if (tabName === "tags") {
            return navigate({ to: `/list/${mediaType}/${username}/tags` });
        }
        if (tabName === "stats") {
            return navigate({ to: `/list/${mediaType}/${username}/stats` });
        }
        if (tabName === "collections") {
            return navigate({ to: `/list/${mediaType}/${username}/collections` });
        }
        if (tabName === "activity") {
            const year = new Date().getFullYear();
            const month = new Date().getMonth() + 1;

            return navigate({
                to: `/list/${mediaType}/${username}/activity`,
                search: { year: String(year), month: String(month) },
            });
        }

        return navigate({ to: `/list/${mediaType}/${username}/achievements` });
    };

    const tabs = [
        {
            id: "list",
            label: "List",
            isAccent: true,
            icon: <Library className="size-4"/>,
        }, {
            isAccent: true,
            id: "tags",
            label: "Tags",
            icon: <Tags className="size-4"/>,
        }, {
            id: "stats",
            label: "stats",
            isAccent: true,
            icon: <ChartNoAxesColumn className="size-4"/>,
        }, {
            isAccent: true,
            id: "collections",
            label: "collections",
            icon: <ListOrdered className="size-4"/>,
        }, {
            isAccent: true,
            id: "achievements",
            label: "achievements",
            icon: <Award className="size-4"/>,
        }, {
            isAccent: true,
            id: "activity",
            label: "activity",
            icon: <Zap className="size-4"/>,
        },
    ]

    return (
        <PageTitle title={`${username} ${capitalize(mediaType)} ${capitalize(activeTab)}`} onlyHelmet>
            <div className="pt-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <MediaLevel
                            className="text-2xl"
                            mediaType={mediaType}
                            timeSpentMin={timeSpent}
                            containerClassName="pt-1"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight capitalize">
                            {mediaType} {activeTab}
                        </h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <User className="size-3"/> {username}
                        </p>
                    </div>
                </div>
                <div className="pt-5">
                    <TabHeader
                        tabs={tabs}
                        activeTab={activeTab}
                        setActiveTab={(tabName) => onTabChange(tabName)}
                    >
                        <QuickActions
                            username={username}
                            mediaType={mediaType}
                        />
                    </TabHeader>
                </div>
            </div>
            <div className="pt-4">
                <Outlet/>
            </div>
        </PageTitle>
    );
}
