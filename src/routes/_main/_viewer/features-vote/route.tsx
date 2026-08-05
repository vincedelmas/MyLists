import {useId, useState} from "react";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {FeatureStatus} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {CalendarClock, ChevronUp, ExternalLink} from "lucide-react";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {featureVotesOptions} from "@/lib/client/react-query/query-options";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {AdminFeatureControlsDialog} from "@/lib/client/components/feature-votes/AdminFeaturesDialog";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/lib/client/components/ui/card";
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
    [FeatureStatus.PLANNED]: "border-info/40 bg-info/10 text-info",
    [FeatureStatus.REJECTED]: "border-destructive/40 bg-destructive/10 text-destructive",
    [FeatureStatus.COMPLETED]: "border-success/40 bg-success/10 text-success",
    [FeatureStatus.IN_PROGRESS]: "border-brand/40 bg-brand/10 text-brand",
    [FeatureStatus.UNDER_CONSIDERATION]: "border-warning/40 bg-warning/10 text-warning",
};


function FeatureVotesPage() {
    const fieldId = useId();
    const navigate = Route.useNavigate();
    const { activeTab } = Route.useSearch();
    const { currentUser, isAnonymous } = useAuth();
    const toggleVoteMutation = useToggleFeatureVoteMutation();
    const apiData = useSuspenseQuery(featureVotesOptions).data;
    const [searchQuery, setSearchQuery] = useState("");
    const isAdmin = currentUser?.capabilities.manageFeatureRequests ?? false;
    const createFeatureMutation = useCreateFeatureRequestMutation({ noErrorToast: true });
    const form = useForm<PostFeatureRequest>({
        resolver: zodResolver(postFeatureRequestSchema),
        defaultValues: {
            title: "",
            description: "",
        },
    });

    const filteredRequests = apiData.items.filter((item) => {
        if (searchQuery.trim()) {
            const search = searchQuery.toLowerCase();
            return item.title.toLowerCase().includes(search) || item.description?.toLowerCase().includes(search);
        }

        return activeTab === "active" ? ACTIVE_STATUSES.includes(item.status) : item.status === activeTab;
    }).sort((a, b) => b.totalVotes - a.totalVotes);

    const onSubmitAddNewFeature = (submitted: PostFeatureRequest) => {
        createFeatureMutation.mutate({ data: submitted }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
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
                    <Card className="ring-border">
                        <CardHeader>
                            <CardTitle>Quick Q&A</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-4 text-sm text-muted-foreground">
                                <div>
                                    <dt className="font-semibold text-foreground">
                                        How do votes work?
                                    </dt>
                                    <dd>
                                        Each feature gets one vote per user. You can rescind it while voting is open.
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">
                                        Can I vote more than once?
                                    </dt>
                                    <dd>
                                        No. Each account gets one vote per feature request.
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">
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
                    <Card className="relative overflow-hidden ring-brand/40">
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
                            <FormProvider {...form}>
                                <form onSubmit={form.handleSubmit(onSubmitAddNewFeature)} className="flex flex-col gap-4">
                                    <FieldSet disabled={createFeatureMutation.isPending || isAnonymous}>
                                        <FieldGroup>
                                            <Controller
                                                name="title"
                                                control={form.control}
                                                render={({ field, fieldState }) =>
                                                    <Field
                                                        data-invalid={fieldState.invalid}
                                                        data-disabled={createFeatureMutation.isPending || isAnonymous}
                                                    >
                                                        <FieldLabel htmlFor={`${fieldId}-title`}>
                                                            Title
                                                        </FieldLabel>
                                                        <Input
                                                            {...field}
                                                            id={`${fieldId}-title`}
                                                            placeholder="Feature title"
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        <FieldError errors={[fieldState.error]}/>
                                                    </Field>
                                                }
                                            />
                                            <Controller
                                                name="description"
                                                control={form.control}
                                                render={({ field, fieldState }) =>
                                                    <Field
                                                        data-invalid={fieldState.invalid}
                                                        data-disabled={createFeatureMutation.isPending || isAnonymous}
                                                    >
                                                        <FieldLabel htmlFor={`${fieldId}-desc`}>
                                                            Description
                                                        </FieldLabel>
                                                        <Textarea
                                                            {...field}
                                                            rows={3}
                                                            id={`${fieldId}-desc`}
                                                            placeholder="Optional: add a short context or use-case."
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        <FieldError errors={[fieldState.error]}/>
                                                    </Field>
                                                }
                                            />
                                        </FieldGroup>
                                    </FieldSet>
                                    <FormError/>
                                    <div className="flex items-center justify-center">
                                        <FormSubmitButton disabled={isAnonymous} isLoading={createFeatureMutation.isPending}>
                                            Add Feature for Voting
                                        </FormSubmitButton>
                                    </div>
                                </form>
                            </FormProvider>
                        </CardContent>
                    </Card>
                </div>
                <Card className="h-fit ring-brand/40">
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
                                <Button>
                                    Github Discussions <ExternalLink/>
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <SearchInput
                    value={searchQuery}
                    className="max-w-sm max-sm:w-full mb-2"
                    placeholder="Search by title or description..."
                    onChange={(ev) => setSearchQuery(ev.target.value)}
                />

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
                                                className="inline-flex items-center gap-1.5 text-foreground hover:text-brand"
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
                                        {req.author && <span>&bull;</span>}
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarClock className="size-3"/>
                                            Created {formatDateTime(req.createdAt)}
                                        </span>
                                    </CardDescription>
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
                                            <div className="text-sm font-semibold text-brand">
                                                Admin note:
                                            </div>
                                            {req.adminComment}
                                        </div>
                                    }

                                    <div className="flex flex-wrap gap-2 items-center justify-between">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                onClick={() => handleVote(req.id)}
                                                variant={req.hasUserVote ? "selected" : "outline"}
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
