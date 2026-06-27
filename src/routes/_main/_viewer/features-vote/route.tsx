import {useMemo, useState} from "react";
import {useForm} from "react-hook-form";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {FeatureStatus, isAtLeastRole, RoleType,} from "@/lib/utils/enums";
import {featureVotesOptions} from "@/lib/client/react-query/query-options";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {CalendarClock, ChevronUp, ExternalLink, Search} from "lucide-react";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {AdminFeatureControlsDialog} from "@/lib/client/components/feature-votes/AdminFeaturesDialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,} from "@/lib/client/components/ui/card";
import {FeatureVotesActiveTab, featureVotesSearchSchema, PostFeatureRequest, postFeatureRequestSchema} from "@/lib/schemas";
import {useCreateFeatureRequestMutation, useToggleFeatureVoteMutation} from "@/lib/client/react-query/query-mutations/feature-votes.mutations";


export const Route = createFileRoute("/_main/_viewer/features-vote")({
    validateSearch: featureVotesSearchSchema,
    loader: ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(featureVotesOptions);
    },
    component: FeatureVotesPage,
});


const ACTIVE_STATUSES: FeatureStatus[] = [
    FeatureStatus.PLANNED,
    FeatureStatus.IN_PROGRESS,
    FeatureStatus.UNDER_CONSIDERATION,
];


const STATUS_STYLES: Record<FeatureStatus, string> = {
    [FeatureStatus.PLANNED]: "border-sky-500/40 text-sky-200 bg-sky-500/10",
    [FeatureStatus.REJECTED]: "border-rose-500/40 text-rose-200 bg-rose-500/10",
    [FeatureStatus.COMPLETED]: "border-violet-500/40 text-violet-200 bg-violet-500/10",
    [FeatureStatus.IN_PROGRESS]: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
    [FeatureStatus.UNDER_CONSIDERATION]: "border-amber-500/40 text-amber-200 bg-amber-500/10",
};


function FeatureVotesPage() {
    const navigate = Route.useNavigate();
    const { activeTab } = Route.useSearch();
    const { currentUser, isAnonymous } = useAuth();
    const toggleVoteMutation = useToggleFeatureVoteMutation();
    const apiData = useSuspenseQuery(featureVotesOptions).data;
    const [searchQuery, setSearchQuery] = useState("");
    const createFeatureMutation = useCreateFeatureRequestMutation();
    const isAdmin = isAtLeastRole(currentUser?.role ?? null, RoleType.ADMIN);
    const form = useForm<PostFeatureRequest>({
        resolver: zodResolver(postFeatureRequestSchema),
        defaultValues: {
            title: "",
            description: "",
        },
    });

    const filteredRequests = useMemo(() => {
        return apiData.items
            .filter((item) => {
                if (searchQuery.trim()) {
                    const search = searchQuery.toLowerCase();
                    return item.title.toLowerCase().includes(search) || item.description?.toLowerCase().includes(search);
                }

                return activeTab === "active"
                    ? ACTIVE_STATUSES.includes(item.status)
                    : item.status === activeTab;
            })
            .sort((a, b) => b.totalVotes - a.totalVotes);
    }, [apiData.items, activeTab, searchQuery]);

    const handleAddNewFeature = (submitted: PostFeatureRequest) => {
        createFeatureMutation.mutate({ data: submitted }, {
            onSuccess: () => {
                form.reset();
            },
        });
    };

    const handleVote = (featureId: number) => {
        toggleVoteMutation.mutate({ data: { featureId } });
    };

    const setActiveTab = (newTab: FeatureVotesActiveTab) => {
        void navigate({ search: { activeTab: newTab === "active" ? undefined : newTab }, resetScroll: false });
    };

    const statusTabs: TabItem<FeatureVotesActiveTab>[] = [
        {
            id: "active",
            isAccent: true,
            label: "Active",
        },
        ...Object.values(FeatureStatus).map((status) => ({
            id: status,
            label: status,
            isAccent: true,
        }))
    ];

    return (
        <PageTitle title="Feature Voting Hub" subtitle="Submit ideas, search, and vote on what MyLists should have next.">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
                    <Card className="border-gray-500">
                        <CardHeader>
                            <CardTitle>Quick Q&A</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-4 text-sm text-muted-foreground">
                                <div>
                                    <dt className="font-semibold text-primary">
                                        How do votes work?
                                    </dt>
                                    <dd>
                                        Each feature gets one vote per user. You can rescind it while voting is open.
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-primary">
                                        Can I vote more than once?
                                    </dt>
                                    <dd>
                                        No. Each account gets one vote per feature request.
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-primary">
                                        Will I be notified about feature updates?
                                    </dt>
                                    <dd>
                                        Yes. When an admins adds a note or changes your request status, you will receive an
                                        in-app notification.
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden border-app-accent/40">
                        <LockedContent
                            showAuthButtons={true}
                            isAnonymous={isAnonymous}
                            title="Have an idea for MyLists?"
                            description="Log-in or register to submit your proposal and join the community in voting for our next features."
                        />
                        <CardHeader>
                            <CardTitle>Propose a new feature</CardTitle>
                            <CardDescription>
                                Share a short title and optional description.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleAddNewFeature)} className="space-y-4">
                                    <fieldset disabled={createFeatureMutation.isPending || isAnonymous} className="space-y-4">
                                        <FormField
                                            name="title"
                                            control={form.control}
                                            render={({ field }) =>
                                                <FormItem>
                                                    <FormLabel>Title</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="Feature title"
                                                        />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            }
                                        />
                                        <FormField
                                            name="description"
                                            control={form.control}
                                            render={({ field }) =>
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            {...field}
                                                            rows={3}
                                                            placeholder="Optional: add a short context or use-case."
                                                        />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            }
                                        />
                                    </fieldset>
                                    <div className="flex items-center justify-center">
                                        <Button type="submit" disabled={createFeatureMutation.isPending || isAnonymous}>
                                            Add Feature for Voting
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
                <Card className="border-app-rating h-fit">
                    <CardHeader>
                        <CardTitle>Discussions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            If you want to discuss a feature idea in more details and exchange with me,
                            please do not hesitate to open a new discussion on GitHub discussions here:{" "}
                        </div>
                        <div className="text-center">
                            <a href="https://github.com/Crossoufire/MyLists/discussions" target="_blank" rel="noreferrer">
                                <Button variant="emeraldy">
                                    Github Discussions <ExternalLink/>
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <div className="relative max-w-sm max-sm:w-full mb-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"/>
                    <Input
                        type="search"
                        className="pl-8"
                        value={searchQuery}
                        placeholder="Search by title or description..."
                        onChange={(ev) => setSearchQuery(ev.target.value)}
                    />
                </div>

                <TabHeader
                    tabs={statusTabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <div className="grid gap-6">
                    {filteredRequests.map((req) => {
                        const voteLabel = req.hasUserVote ? "Rescind vote" : "Vote";
                        const isLocked = req.status === FeatureStatus.REJECTED || req.status === FeatureStatus.COMPLETED;

                        return (
                            <Card key={req.id}>
                                <CardHeader>
                                    <CardTitle>{req.title}</CardTitle>
                                    <CardDescription className="text-xs flex flex-wrap items-center gap-2">
                                        {req.author &&
                                            <Link
                                                to="/profile/$username"
                                                params={{ username: req.author.name }}
                                                className="inline-flex items-center gap-1.5 text-primary hover:text-app-accent"
                                            >
                                                <ProfileIcon
                                                    className="size-5 border"
                                                    fallbackSize="text-[0.6rem]"
                                                    user={{ image: req.author.image, name: req.author.name }}
                                                />
                                                <span className="font-medium">
                                                    {req.author.name}
                                                </span>
                                            </Link>
                                        }
                                        {req.author && "-"}
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarClock className="size-3"/>
                                            Created {formatDateTime(req.createdAt)}
                                        </span>
                                    </CardDescription>
                                    <CardAction>

                                    </CardAction>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex gap-3">
                                        <Badge className={STATUS_STYLES[req.status]}>
                                            {req.status}
                                        </Badge>
                                        <Badge variant="outline">
                                            <ChevronUp/> {req.totalVotes} votes
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-sm">
                                        {req.description}
                                    </div>

                                    {req.adminComment &&
                                        <div className="rounded-lg border border-dashed px-3 py-2 text-sm">
                                            <div className="text-sm font-semibold text-app-accent">
                                                Admin note:
                                            </div>
                                            {req.adminComment}
                                        </div>
                                    }

                                    <div className="flex flex-wrap gap-2 items-center justify-between">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleVote(req.id)}
                                                variant={req.hasUserVote ? "emeraldy" : "outline"}
                                                disabled={toggleVoteMutation.isPending || isLocked || isAnonymous}
                                            >
                                                {voteLabel}
                                            </Button>
                                        </div>

                                        {isAdmin &&
                                            <AdminFeatureControlsDialog
                                                featureId={req.id}
                                                currentStatus={req.status}
                                                currentComment={req.adminComment}
                                            />
                                        }
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </PageTitle>
    );
}
