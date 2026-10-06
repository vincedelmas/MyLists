import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {ArrowRight, Layers3, Pin, Plus} from "lucide-react";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {SMART_VIEW_PRESETS} from "@/lib/utils/smart-views/presets";
import {MAX_PROFILE_SMART_VIEWS} from "@/lib/schemas/smart-view-profile.schema";
import {SmartViewCard} from "@/lib/client/components/smart-views/SmartViewCard";
import {smartViewsOptions} from "@/lib/client/react-query/query-options/smart-views.options";
import {SMART_VIEW_PRESET_ICONS} from "@/lib/client/components/smart-views/smart-view.config";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


export const Route = createFileRoute("/_main/_private/smart-views/")({
    loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(smartViewsOptions),
    component: SmartViewsPage,
});


function SmartViewsPage() {
    const views = useSuspenseQuery(smartViewsOptions).data;
    const pinnedCount = views.filter(view => view.profilePosition !== null).length;

    return (
        <PageTitle title="Smart lists" onlyHelmet>
            <div className="flex min-w-0 flex-col gap-8 pt-6 pb-12 sm:gap-10 sm:pt-9">
                <PageHeader
                    title="Smart lists"
                    eyebrow="Tracking lists"
                    eyebrowIcon={Layers3}
                    description="Your library, organized by the rules you choose."
                    asideValue={
                        <Link to="/smart-views/create" className={buttonVariants({ size: "lg" })}>
                            <Plus data-icon="inline-start"/> Create list
                        </Link>
                    }
                />

                <section className="flex min-w-0 flex-col gap-4" aria-labelledby="saved-views-title">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="saved-views-title" className="text-sm font-medium text-muted-foreground">
                            {views.length} {views.length === 1 ? "saved list" : "saved lists"}
                        </h2>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Pin className="size-3.5" aria-hidden="true"/>
                            {pinnedCount} / {MAX_PROFILE_SMART_VIEWS} pinned to profile
                        </span>
                    </div>
                    {views.length > 0 ?
                        <div className="flex min-w-0 flex-col gap-3">
                            {views.map(view => <SmartViewCard view={view} key={view.id}/>)}
                        </div>
                        :
                        <Empty className="border py-14">
                            <EmptyHeader>
                                <EmptyMedia variant="icon"><Layers3/></EmptyMedia>
                                <EmptyTitle>Your next list starts here</EmptyTitle>
                                <EmptyDescription>
                                    Create your own rules, or try a starting point below. Matching titles update with your library.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                </section>

                <section className="flex flex-col gap-4" aria-labelledby="starter-views-title">
                    <div className="flex flex-col gap-1">
                        <h2 id="starter-views-title" className="text-lg font-semibold tracking-tight">Start with an idea</h2>
                        <p className="text-sm text-muted-foreground">A little inspiration. Make any of these your own.</p>
                    </div>
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                        {SMART_VIEW_PRESETS.map((preset, index) => {
                            const Icon = SMART_VIEW_PRESET_ICONS[preset.title];
                            return (
                                <Link
                                    key={preset.title}
                                    to="/smart-views/create"
                                    search={{ preset: index }}
                                    className="group flex min-w-0 items-center gap-3 rounded-lg px-2 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Icon className="size-4" aria-hidden="true"/>
                                    </span>
                                    <span className="min-w-0 flex-1 text-sm font-medium">{preset.title}</span>
                                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </PageTitle>
    );
}
