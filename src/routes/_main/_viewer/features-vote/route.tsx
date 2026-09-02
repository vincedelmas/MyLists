import {useId, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {FeatureStatus} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {featureVotesOptions} from "@/lib/client/react-query/query-options";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {AdminFeatureControlsDialog} from "@/lib/client/components/feature-votes/AdminFeaturesDialog";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {FeatureVotesActiveTab, featureVotesSearchSchema, PostFeatureRequest, postFeatureRequestSchema} from "@/lib/schemas";
import {CalendarClock, ChevronUp, CircleHelp, ExternalLink, Lightbulb, ListChecks, MessageSquarePlus, SearchX} from "lucide-react";
import {useCreateFeatureRequestMutation, useToggleFeatureVoteMutation} from "@/lib/client/react-query/query-mutations/feature-votes.mutations";


export const Route = createFileRoute("/_main/_viewer/features-vote")({
    validateSearch: featureVotesSearchSchema,
    context: () => ({ featureVotesQueryOptions: featureVotesOptions }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.featureVotesQueryOptions),
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
    const { activeTab } = Route.useSearch();
    const { currentUser, isAnonymous } = useAuth();
    const toggleVoteMutation = useToggleFeatureVoteMutation();
    const { featureVotesQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(featureVotesQueryOptions).data;
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
        <PageTitle title="Feature Voting Hub" onlyHelmet>
            <div className="mb-12 flex flex-col pt-8">
                <PageHeader
                    asideIcon={ListChecks}
                    eyebrowIcon={Lightbulb}
                    title="Help shape MyLists"
                    eyebrow="Feature ideas"
                    description="Share an idea or vote for the changes you’d most like to see."
                    asideValue={<>{filteredRequests.length} {filteredRequests.length === 1 ? "idea" : "ideas"}</>}
                    asideLabel={searchQuery ? "Ideas found" : activeTab === "active" ? "Open ideas" : `${activeTab} ideas`}
                />

                <section className="mt-7 grid grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)] overflow-hidden rounded-xl border shadow-xs max-lg:grid-cols-1">
                    <div className="relative overflow-hidden border-r p-6 max-lg:border-b max-lg:border-r-0 sm:p-7">
                        <LockedContent
                            showAuthButtons={true}
                            isAnonymous={isAnonymous}
                            title="Have an idea for MyLists?"
                            description="Sign in or create an account to share an idea and vote for what I build next."
                        />
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                            <MessageSquarePlus className="size-4" aria-hidden="true"/>
                            Share an idea
                        </div>
                        <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
                            Propose a new feature
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                            Give the idea a clear title and add enough context for other members to understand it.
                        </p>

                        <FormProvider {...form}>
                            <form onSubmit={form.handleSubmit(onSubmitAddNewFeature)} className="mt-6 flex flex-col gap-4">
                                <FieldSet disabled={createFeatureMutation.isPending || isAnonymous}>
                                    <FieldGroup className="gap-4">
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
                                                        aria-invalid={fieldState.invalid}
                                                        placeholder="Optional: add a short context or use-case."
                                                    />
                                                    <FieldError errors={[fieldState.error]}/>
                                                </Field>
                                            }
                                        />
                                    </FieldGroup>
                                </FieldSet>
                                <FormError/>
                                <div className="flex justify-end">
                                    <FormSubmitButton disabled={isAnonymous} isLoading={createFeatureMutation.isPending}>
                                        Submit proposal
                                    </FormSubmitButton>
                                </div>
                            </form>
                        </FormProvider>
                    </div>

                    <aside className="p-6 sm:p-7">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                            <CircleHelp className="size-4" aria-hidden="true"/>
                            How it works
                        </div>
                        <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
                            A simple community signal
                        </h2>

                        <dl className="mt-5 border-t">
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b py-3.5">
                                <span className="font-mono text-xs font-semibold text-brand" aria-hidden="true">01</span>
                                <div>
                                    <dt className="text-sm font-semibold text-foreground">One vote per idea</dt>
                                    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        Every account can support each proposal once.
                                    </dd>
                                </div>
                            </div>
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b py-3.5">
                                <span className="font-mono text-xs font-semibold text-brand" aria-hidden="true">02</span>
                                <div>
                                    <dt className="text-sm font-semibold text-foreground">Change your mind</dt>
                                    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        You can rescind your vote while voting remains open.
                                    </dd>
                                </div>
                            </div>
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b py-3.5">
                                <span className="font-mono text-xs font-semibold text-brand" aria-hidden="true">03</span>
                                <div>
                                    <dt className="text-sm font-semibold text-foreground">Follow the outcome</dt>
                                    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        Status changes and admin notes generate an in-app notification.
                                    </dd>
                                </div>
                            </div>
                        </dl>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                            <p className="max-w-xs text-sm leading-relaxed">
                                Need a longer conversation before proposing something?
                            </p>
                            <a
                                target="_blank"
                                rel="noreferrer"
                                className={cn(buttonVariants({ variant: "outline" }))}
                                href="https://github.com/Crossoufire/MyLists/discussions"
                            >
                                GitHub discussions
                                <ExternalLink data-icon="inline-end"/>
                            </a>
                        </div>
                    </aside>
                </section>

                <section className="pt-12">
                    <div className="flex items-end justify-between gap-6 pb-5 max-sm:flex-col max-sm:items-start max-sm:gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                                Browse proposals
                            </div>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                                Community roadmap
                            </h2>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            Sorted by community votes
                        </span>
                    </div>

                    <SearchInput
                        value={searchQuery}
                        className="mb-3 w-full max-w-md max-sm:max-w-none"
                        placeholder="Search by title or description..."
                        onChange={(ev) => setSearchQuery(ev.target.value)}
                    />

                    <TabHeader
                        tabs={statusTabs}
                        value={activeTab}
                        triggerClassName="max-sm:px-3"
                        renderTrigger={(tab, props) =>
                            <Link
                                {...props}
                                to="/features-vote"
                                resetScroll={false}
                                search={{ activeTab: tab.id === "active" ? undefined : tab.id }}
                            />
                        }
                    />

                    {filteredRequests.length === 0
                        ?
                        <EmptyState
                            icon={SearchX}
                            className="mt-4 rounded-xl border py-20"
                            message={searchQuery ? "No proposals match this search." : "No proposals have this status yet."}
                        />
                        :
                        <div className="grid gap-3 pt-4">
                            {filteredRequests.map((req) => {
                                const voteLabel = req.hasUserVote ? "Rescind vote" : "Vote";
                                const isLocked = req.status === FeatureStatus.REJECTED || req.status === FeatureStatus.COMPLETED;

                                return (
                                    <article
                                        key={req.id}
                                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-5 rounded-xl border p-5 shadow-xs max-sm:grid-cols-[3.75rem_minmax(0,1fr)] max-sm:gap-3 max-sm:p-4"
                                    >
                                        <div className="flex flex-col items-center border-r pr-5 max-sm:pr-3">
                                            <Button
                                                size="icon-sm"
                                                onClick={() => handleVote(req.id)}
                                                variant={req.hasUserVote ? "selected" : "outline"}
                                                disabled={toggleVoteMutation.isPending || isLocked || isAnonymous}
                                                aria-label={`${voteLabel} for ${req.title}`}
                                                title={isAnonymous ? "Sign in to vote" : isLocked ? "Voting is closed" : voteLabel}
                                            >
                                                <ChevronUp/>
                                            </Button>
                                            <strong className="mt-2 font-mono text-lg leading-none tabular-nums text-foreground">
                                                {req.totalVotes}
                                            </strong>
                                            <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                {req.totalVotes === 1 ? "vote" : "votes"}
                                            </span>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-base font-semibold text-foreground">
                                                            {req.title}
                                                        </h3>
                                                        <Badge className={STATUS_STYLES[req.status]}>
                                                            {req.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                                                        {req.author && <span aria-hidden="true">&bull;</span>}
                                                        <span className="inline-flex items-center gap-1">
                                                            <CalendarClock className="size-3"/>
                                                            Created {formatDateTime(req.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isAdmin &&
                                                    <AdminFeatureControlsDialog
                                                        featureId={req.id}
                                                        currentStatus={req.status}
                                                        currentComment={req.adminComment}
                                                    />
                                                }
                                            </div>

                                            {req.description &&
                                                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                                                    {req.description}
                                                </p>
                                            }

                                            {req.adminComment &&
                                                <div className="mt-4 border-l-2 border-brand/50 pl-3 text-sm leading-relaxed">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-brand">
                                                        Admin note
                                                    </div>
                                                    <p className="mt-1 text-muted-foreground">
                                                        {req.adminComment}
                                                    </p>
                                                </div>
                                            }
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    }
                </section>
            </div>
        </PageTitle>
    );
}
