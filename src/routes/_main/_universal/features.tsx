import {JSX} from "react";
import {ApiProviderType} from "@/lib/utils/enums";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {createFileRoute, Link} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {
    Activity,
    BadgePlus,
    BarChart3,
    BellRing,
    BookOpen,
    CheckCheck,
    ChevronDown,
    ClockCheck,
    ClockPlus,
    Edit3,
    Gamepad2,
    GraduationCap,
    Highlighter,
    ImageUp,
    LayoutList,
    ListOrdered,
    LucideIcon,
    Monitor,
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
        <PageTitle title="News & Features" subtitle="The latest changes first, then a quick look at what MyLists can do today.">
            <div className="mb-20 space-y-16">
                <section>
                    <SectionHeader
                        icon={ClockPlus}
                        title="Latest Release"
                        description="This is the place where I put the last things I shipped (mix of new stuff, fixes, and bigger rewrites)."
                    />
                    <ReleaseCard
                        release={LATEST_RELEASE}
                    />
                </section>

                <div className="space-y-15">
                    {activeCategories.map((category) =>
                        <section key={category}>
                            <SectionHeader
                                title={category}
                                icon={getCategoryIcon(category)}
                                description={AREA_DESCRIPTIONS[category]}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {groupedFeatures[category]?.map((feature) =>
                                    <FeatureCard
                                        feature={feature}
                                        key={feature.name}
                                    />
                                )}
                            </div>
                        </section>
                    )}
                </div>
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
                        https://mylists.info/search?q=<span className="text-emerald-400">term</span>&apiProvider=<span className="text-orange-400">provider</span>
                    </div>
                </div>

                <div>
                    <div className="font-semibold mb-2">
                        Providers
                    </div>
                    <ul className="space-y-1 text-xs text-slate-400 font-mono">
                        <li><span className="text-blue-400">{ApiProviderType.TMDB}</span> - Series, Anime, Movies</li>
                        <li><span className="text-blue-400">{ApiProviderType.IGDB}</span> - Games</li>
                        <li><span className="text-blue-400">{ApiProviderType.BOOKS}</span> - Books</li>
                        <li><span className="text-blue-400">{ApiProviderType.MANGA}</span> - Manga</li>
                        <li><span className="text-blue-400">{ApiProviderType.USERS}</span> - Users</li>
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
                <Link to="/features-vote" className="inline-flex gap-1 items-center text-app-accent font-medium hover:text-app-accent/80">
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
                <Link to="/walkthrough/search-media" className="inline-flex gap-1 items-center text-app-accent font-medium hover:text-app-accent/80">
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
        <div className="relative overflow-hidden rounded-lg border transition-all duration-300 flex flex-col bg-background">
            <div className="p-4 flex-1">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg shrink-0 bg-app-accent/20 text-primary">
                        <Icon className="size-5"/>
                    </div>
                    <div>
                        <h3 className="font-bold text-base mb-1.5">
                            {feature.name}
                        </h3>
                        <div className="text-sm text-muted-foreground leading-normal">
                            {feature.description}
                        </div>
                    </div>
                </div>
            </div>

            {feature.details &&
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="w-full py-2 bg-popover border-t text-xs font-medium text-app-accent
                        transition-colors flex items-center justify-center gap-1 hover:bg-popover/50">
                            Learn More
                            <ChevronDown className="size-3"/>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-4 text-sm shadow-xl">
                        <div className="space-y-2">
                            <h4 className="font-bold flex items-center gap-2">
                                <Icon className="size-4 text-app-accent"/>
                                {feature.name}
                            </h4>
                            <div className="pt-2 border-t text-muted-foreground leading-relaxed">
                                {feature.details}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            }
        </div>
    );
};


const SectionHeader = ({ title, icon: Icon, description }: { title: string, icon: LucideIcon, description?: string }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2">
            <Icon className="size-4 text-app-accent"/>
            <h2 className="text-lg font-bold text-primary tracking-wide">
                {title}
            </h2>
        </div>
        {description &&
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-2">
                {description}
            </p>
        }
        <div className="h-1 w-30 bg-linear-to-r from-app-accent to-transparent rounded-full mb-2"/>
    </div>
);


const ReleaseCard = ({ release }: { release: ReleaseData }) => {
    const Icon = release.icon;

    return (
        <div className="rounded-lg border bg-background overflow-hidden">
            <div className="p-4 border-b bg-popover/40">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg shrink-0 bg-app-accent/20 text-primary md:p-3">
                                <Icon className="size-5 md:size-7"/>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-bold text-primary leading-tight md:text-2xl">
                                    {release.title}
                                </h3>
                                <span className="mt-0.5 text-xs text-muted-foreground font-medium">
                                    {release.date}
                                </span>
                            </div>
                        </div>
                        <p className="mt-4 max-w-3xl text-sm text-muted-foreground leading-relaxed">
                            {release.summary}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
                <Icon className="size-4 text-app-accent"/>
                <UpdateTypeBadge type={item.type}/>
            </div>
            <h4 className="font-bold text-primary mb-2">
                {item.name}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
            </p>
        </div>
    );
};


const UpdateTypeBadge = ({ type }: { type: UpdateType }) => {
    const config = {
        New: {
            icon: BadgePlus,
            className: "border-app-accent/40 bg-app-accent/15 text-primary ",
        },
        Revamped: {
            icon: Wrench,
            className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
        },
        Improved: {
            icon: SlidersHorizontal,
            className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
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
