import {JSX} from "react";
import {ApiProviderType} from "@/lib/utils/enums";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {
    Activity,
    BadgePlus,
    BarChart3,
    BellRing,
    BookOpen,
    CalendarDays,
    CheckCheck,
    ChevronDown,
    ClockCheck,
    Edit3,
    Gamepad2,
    GraduationCap,
    Highlighter,
    ImageUp,
    LayoutList,
    ListOrdered,
    LucideIcon,
    Monitor,
    Newspaper,
    Repeat,
    Search,
    Shield,
    SlidersHorizontal,
    Trophy,
    Users,
    Wrench,
} from "lucide-react";


export const Route = createFileRoute("/_main/_universal/features")({
    head: () => ({
        links: addSeoLinks({ canonical: "/features" }),
        meta: addSeo({
            image: "/logo512.png",
            canonical: "/features",
            title: "MyLists Features - Lists, stats, follows, achievements and collections",
            description: "See what changed recently in MyLists, and the main features already available.",
        }),
    }),
    component: FeaturesPage,
});


function FeaturesPage() {
    const groupedFeatures = FEATURES_DATA.reduce((acc, feature) => {
            const cat = feature.area;
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat]!.push(feature);
            return acc;
        },
        {} as Partial<Record<FeatureData["area"], FeatureData[]>>
    );

    const activeCategories = AREA_ORDER.filter((area) => groupedFeatures[area]?.length);

    const getCategoryIcon = (category: FeatureData["area"]) => {
        switch (category) {
            case "Lists & Tracking":
                return LayoutList;
            case "Stats & Insights":
                return BarChart3;
            case "Social & Notifications":
                return Users;
            case "Customization":
                return Edit3;
            case "Gamification":
                return Gamepad2;
            default:
                return Search;
        }
    };

    return (
        <PageTitle title="News & Features" onlyHelmet>
            <div className="mb-16 flex flex-col pt-8">
                <PageHeader
                    eyebrow="What’s new"
                    title="News & features"
                    eyebrowIcon={Newspaper}
                    asideIcon={CalendarDays}
                    asideLabel="Latest update"
                    asideValue={LATEST_RELEASE.date}
                    description="See what changed recently and what you can do with MyLists today."
                />

                <ReleaseCard
                    release={LATEST_RELEASE}
                />

                <section className="pt-8">
                    <div className="flex items-end justify-between gap-8 pb-4 max-sm:flex-col max-sm:items-start max-sm:gap-3">
                        <div>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                                Explore MyLists
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                The tools available across tracking, statistics, community, customization, and play.
                            </p>
                        </div>
                        <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {FEATURES_DATA.length} features · {activeCategories.length} areas
                        </div>
                    </div>

                    {activeCategories.map((category, idx) => {
                        const CategoryIcon = getCategoryIcon(category);

                        return (
                            <section
                                key={category}
                                className="grid grid-cols-[minmax(13rem,0.34fr)_minmax(0,1fr)] gap-10 py-6 max-lg:grid-cols-1 max-lg:gap-6"
                            >
                                <div>
                                    <div className="flex items-center gap-2 text-brand">
                                        <CategoryIcon className="size-4" aria-hidden="true"/>
                                        <span className="text-xs font-semibold tabular-nums">
                                            {String(idx + 1).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                                        {category}
                                    </h3>
                                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                        {AREA_DESCRIPTIONS[category]}
                                    </p>
                                </div>

                                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                                    {groupedFeatures[category]?.map((feature) =>
                                        <FeatureCard
                                            feature={feature}
                                            key={feature.name}
                                        />
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </section>
            </div>
        </PageTitle>
    );
}


type UpdateType = "New" | "Revamped" | "Improved" | "Existing";
type FeatureArea = "Lists & Tracking" | "Stats & Insights" | "Social & Notifications" | "Customization" | "Gamification";

type ReleaseData = {
    title: string,
    date: string,
    icon: LucideIcon,
    type: UpdateType,
    items: FeatureData[],
    summary: JSX.Element | string,
}

type FeatureData = {
    name: string,
    icon: LucideIcon,
    type: UpdateType,
    area: FeatureArea;
    details?: JSX.Element,
    description: JSX.Element | string,
}


const AREA_ORDER: FeatureArea[] = [
    "Lists & Tracking",
    "Stats & Insights",
    "Social & Notifications",
    "Customization",
    "Gamification",
];


const AREA_DESCRIPTIONS: Record<FeatureArea, string> = {
    "Lists & Tracking": "The main tools to keep your media lists clean, update your progress, and organize everything.",
    "Stats & Insights": "Stats for your own profile, the global site, and the little patterns hidden in your lists.",
    "Social & Notifications": "Follow people, see updates, vote for ideas, and keep an eye on upcoming releases.",
    Customization: "Small settings to make your profile and media pages feel a bit more like yours.",
    Gamification: "Optional fun things around achievements, rankings, and mini-games.",
};


const LATEST_RELEASE: ReleaseData = {
    icon: Users,
    type: "New",
    date: "June 2026",
    title: "Taste Matches",
    summary: (
        <span>
            Find users whose ratings line up with yours across the media types you use.
            Matches are based on titles you have both rated, with stronger confidence when there is more shared history.
        </span>
    ),
    items: [
        {
            type: "New",
            icon: BarChart3,
            area: "Social & Notifications",
            name: "Ratings-Based Matching",
            description: <span>Compare rating patterns and rating differences on shared titles to find the closest matches</span>
        },
        {
            type: "New",
            icon: Highlighter,
            name: "Why You Match",
            area: "Social & Notifications",
            description: (
                <span>
                    See the match percentage, shared-rating count, per-media scores,
                    and a selection of titles you both rated highly.
                </span>
            )
        },
        {
            type: "New",
            icon: SlidersHorizontal,
            area: "Social & Notifications",
            name: "Useful Discovery Controls",
            description: (
                <span>
                    Filter by an active media list, search by username, sort by match strength or overlap,
                    and optionally hide people you already follow.
                </span>
            )
        },
    ]
};


const FEATURES_DATA: FeatureData[] = [
    {
        icon: Activity,
        type: "Existing",
        area: "Lists & Tracking",
        name: "Activity Tracking & Cleanup",
        description: (
            <span>
                MyLists logs progress changes automatically and uses them in stats.
                You can also add entries yourself, hide unwanted activity, or clean imported history in bulk.
            </span>
        )
    },
    {
        type: "Existing",
        icon: ClockCheck,
        area: "Lists & Tracking",
        name: "Backlog and Monthly Progress",
        description: (
            <span>
                Forgot to update something yesterday? You can pick an old date, then check what you watched,
                read, or played during the month.
            </span>
        )
    },
    {
        icon: LayoutList,
        type: "Existing",
        area: "Lists & Tracking",
        name: "Your Lists, Without the Pain",
        description: (
            <span>
                Edit entries directly from your lists, use grid or table view,
                filter things properly, and remove updates when you made a mistake.
            </span>
        )
    },
    {
        icon: Repeat,
        type: "Existing",
        name: "Progress Details",
        area: "Lists & Tracking",
        description: (
            <span>
                Track the details that matter, like the platform for a game or re-watches by season for a series.
            </span>
        ),
    },
    {
        icon: BookOpen,
        type: "Existing",
        area: "Lists & Tracking",
        name: "All Media Types",
        description: (
            <span>
                Movies, series, anime, games, books, and manga are all supported.
                You can also export your lists as CSV if you want your data outside the site.
            </span>
        )
    },
    {
        type: "Existing",
        icon: ListOrdered,
        name: "Collections & Tags",
        area: "Lists & Tracking",
        description: (
            <span>
                Make ranked collections if you want to share a selection, or keep them private.
                Tags are there for your own messy organization system.
            </span>
        ),
    },
    {
        icon: Search,
        type: "Existing",
        name: "Search Shortcuts",
        area: "Lists & Tracking",
        description: (
            <span>
                If you like shortcuts, you can search media and users directly from an URL with custom bangs.
            </span>
        ),
        details: (
            <div className="space-y-4 text-sm mt-2">
                <div className="p-3 bg-popover rounded border">
                    <div className="font-semibold mb-1">
                        URL Pattern
                    </div>
                    <div className="font-mono text-xs text-muted-foreground break-all">
                        https://mylists.info/search?q=<span className="text-success">term</span>&apiProvider=<span className="text-warning">provider</span>
                    </div>
                </div>

                <div>
                    <div className="font-semibold mb-2">
                        Providers
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                        <li><span className="text-info">{ApiProviderType.TMDB}</span> - Series, Anime, Movies</li>
                        <li><span className="text-info">{ApiProviderType.IGDB}</span> - Games</li>
                        <li><span className="text-info">{ApiProviderType.BOOKS}</span> - Books</li>
                        <li><span className="text-info">{ApiProviderType.MANGA}</span> - Manga</li>
                        <li><span className="text-info">{ApiProviderType.USERS}</span> - Users</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        icon: BarChart3,
        type: "Existing",
        area: "Stats & Insights",
        name: "Personal & Global Stats",
        description: "Profile stats, global stats, activity stats, and more detailed pages when you want to dig a bit.",
    },
    {
        icon: Trophy,
        name: "Rankings",
        type: "Existing",
        area: "Stats & Insights",
        description: "The Hall of Fame is a simple ranking page for people who like comparing progress."
    },
    {
        type: "Existing",
        icon: Highlighter,
        area: "Customization",
        name: "Profile Highlights",
        description: "Choose what appears in your profile highlights, let it pick random media, or just hide the block."
    },
    {
        icon: ImageUp,
        type: "Existing",
        area: "Customization",
        name: "Media & Profile Images",
        description: "Use your own covers, crop profile images, and avoid ugly stretched pictures.",
    },
    {
        icon: Shield,
        type: "Existing",
        area: "Customization",
        name: "Privacy Controls",
        description: "Choose what people can see on your profile, lists, stats, and updates."
    },
    {
        icon: Users,
        type: "Existing",
        name: "Social Feed",
        area: "Social & Notifications",
        description: "Follow people and see their updates, when their privacy settings allow it."
    },
    {
        icon: BellRing,
        type: "Existing",
        name: "Release Tracking",
        area: "Social & Notifications",
        description: "Keep an eye on upcoming releases and get reminders before episodes or games are out."
    },
    {
        icon: CheckCheck,
        type: "Existing",
        name: "Feature Voting",
        area: "Social & Notifications",
        description: (
            <span>
                Have an idea? Add it and vote for what you would like me to build next{" "}
                <Link to="/features-vote" className="inline-flex gap-1 items-center text-brand font-medium hover:text-brand/80">
                    here
                </Link>.
            </span>
        )
    },
    {
        type: "Existing",
        icon: GraduationCap,
        name: "Walkthrough",
        area: "Social & Notifications",
        description: (
            <span>
                New here? There is a small walkthrough to help you add your first media and understand the basics{" "}
                <Link to="/walkthrough/search-media" className="inline-flex gap-1 items-center text-brand font-medium hover:text-brand/80">
                    here
                </Link>.
            </span>
        )
    },
    {
        icon: Monitor,
        type: "Existing",
        area: "Gamification",
        name: "Moviedle Game",
        description: "A small Wordle-like game where you guess the movie from a pixelated poster."
    },
    {
        icon: Trophy,
        type: "Existing",
        area: "Gamification",
        name: "Achievements",
        description: "Badges you unlock naturally while filling your lists and updating your progress."
    },
];


const FeatureCard = ({ feature }: { feature: FeatureData }) => {
    const Icon = feature.icon;

    return (
        <article className="group flex min-w-0 gap-3 rounded-xl border p-4 shadow-xs transition-colors hover:border-brand/35">
            <div className="flex size-8 shrink-0 items-start justify-center pt-0.5 text-brand">
                <Icon className="size-4.5" aria-hidden="true"/>
            </div>
            <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground">
                    {feature.name}
                </h4>
                <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                </div>

                {feature.details &&
                    <Popover>
                        <PopoverTrigger render={<Button size="bare" variant="ghost"/>} className="mt-3 gap-1.5 text-xs font-semibold text-brand">
                            Learn more
                            <ChevronDown className="size-3.5"/>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-4 text-sm shadow-xl">
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-bold">
                                    <Icon className="size-4 text-brand"/>
                                    {feature.name}
                                </h4>
                                <div className="border-t pt-2 leading-relaxed text-muted-foreground">
                                    {feature.details}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                }
            </div>
        </article>
    );
};


const ReleaseCard = ({ release }: { release: ReleaseData }) => {
    const Icon = release.icon;

    return (
        <div className="mt-8 overflow-hidden rounded-xl border shadow-xs">
            <div className="p-6 pt-4">
                <div>
                    <div className="flex items-center gap-3">
                        <Icon className="size-5 text-brand" aria-hidden="true"/>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            {release.title}
                        </h2>
                        <UpdateTypeBadge type={release.type}/>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                        {release.summary}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 border-t md:grid-cols-3">
                {release.items.map((item, idx) =>
                    <ReleaseItem
                        item={item}
                        key={`${item.name}-${idx}`}
                    />
                )}
            </div>
        </div>
    );
};


const ReleaseItem = ({ item }: { item: FeatureData }) => {
    const Icon = item.icon;

    return (
        <article className="p-5 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Icon className="size-4 text-brand"/>
                {item.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
            </p>
        </article>
    );
};


const UpdateTypeBadge = ({ type }: { type: UpdateType }) => {
    const config = {
        New: {
            icon: BadgePlus,
            className: "border-brand/40 bg-brand/15 text-brand",
        },
        Revamped: {
            icon: Wrench,
            className: "border-info/40 bg-info/10 text-info",
        },
        Improved: {
            icon: SlidersHorizontal,
            className: "border-success/40 bg-success/10 text-success",
        },
        Existing: {
            icon: CheckCheck,
            className: "border-muted-foreground/30 bg-popover text-muted-foreground",
        },
    } satisfies Record<UpdateType, { icon: LucideIcon, className: string }>;

    const Icon = config[type].icon;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold 
        uppercase tracking-wide ${config[type].className}`}>
            <Icon className="size-3"/>
            {type}
        </span>
    );
};
