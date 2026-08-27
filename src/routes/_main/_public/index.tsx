import {cn} from "@/lib/utils/classnames";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Separator} from "@/lib/client/components/ui/separator";
import {useAuthModal} from "@/lib/client/hooks/use-auth-modal";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {randomPublicProfile} from "@/lib/client/react-query/query-options";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {ArrowRight, ArrowUpRight, Check, ChevronDown, CircleDollarSign, Code, Download, LayoutGrid, Lightbulb, Popcorn, Shield, Sparkles, Trophy, Users} from "lucide-react";


export const Route = createFileRoute("/_main/_public/")({
    context: () => ({ randomProfileQueryOptions: randomPublicProfile }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.randomProfileQueryOptions),
    component: HomePage,
    head: () => ({
        links: addSeoLinks({ canonical: "/" }),
        meta: addSeo({
            canonical: "/",
            image: "/logo512.png",
            title: "MyLists - Track movies, series, anime, games, books and manga",
            description: "Organize every movie, series, anime, game, book and manga list in one place with stats, " +
                "achievements, collections, privacy controls and social discovery.",
        }),
    }),
})


const faqs = [
    {
        question: "What can I track on MyLists?",
        answer: "Movies, series, anime, games, books, and manga in one account.",
    },
    {
        question: "Is MyLists free?",
        answer: "Yes. There are no ads, no premium tier, and no locked core features.",
    },
    {
        question: "Can I keep my profile private?",
        answer: "Yes. You can control profile visibility and limit access to approved followers.",
    },
    {
        question: "Can I export my data?",
        answer: "Yes. You can export your media lists as CSV files.",
    },
    {
        question: "Do I need to use the social or gamification features?",
        answer: "No. You can use MyLists as a simple personal tracker, or also use the community, achievements, and leaderboards if that is your thing.",
    },
    {
        question: "Will you add importers from Letterboxd, MAL, IMDb, and similar platforms?",
        answer:
            "Not for now. MyLists is a solo project, and I would rather build imports properly than ship something fragile. " +
            "Some third-party services also have rate-limit and data-mapping constraints, so this needs more work " +
            "before it is worth releasing.",
    },
    {
        question: "Is MyLists still actively developed?",
        answer: "Yes. It is actively maintained, but as a solo project features are prioritized carefully and shipped progressively.",
    },
    {
        question: "Can I suggest features I would like to see?",
        answer: (
            <>
                Yes. There is a dedicated feature request and voting system, so you can suggest ideas and vote on what should be built next.
                Check the <b>Lightbulb on the bottom right corner</b> of the page (accessible once logged in).
            </>
        ),
    },
];

const trustPrinciples = [
    {
        icon: CircleDollarSign,
        badge: "No paywalls",
        variant: "success",
        title: "Free means free.",
        description: "No ads, premium tier, or locked core features. Create an account and use every core feature.",
    },
    {
        icon: Shield,
        badge: "Privacy controls",
        variant: "info",
        title: "You decide who sees your profile.",
        description: "Keep your profile public or limit access to approved followers when you want a more private archive.",
    },
    {
        icon: Download,
        badge: "CSV export",
        variant: "warning",
        title: "Your lists are not trapped here.",
        description: "Export your media lists as CSV files whenever you want a local copy or need to take your data elsewhere.",
    },
    {
        icon: Code,
        badge: "Open source",
        variant: "achievement",
        title: "Built in the open, maintained honestly.",
        description: "MyLists is a solo project with public source code. Features are prioritized carefully and shipped progressively.",
        href: "https://github.com/Crossoufire/MyLists",
    },
] as const;


function HomePage() {
    const { openRegister } = useAuthModal();
    const { randomProfileQueryOptions } = Route.useRouteContext();
    const randomProfile = useSuspenseQuery(randomProfileQueryOptions).data;

    return (
        <>
            <section className="relative -ml-2 w-[calc(100%+1rem)] overflow-hidden border-b border-border/60 sm:left-[calc(-50vw+50%)] sm:ml-0 sm:w-[99.7vw]">
                <div aria-hidden="true" className="absolute inset-0 bg-background">
                    <div className="absolute -left-24 top-12 size-80 rounded-full bg-brand/10 blur-3xl"/>
                    <div className="absolute -right-24 top-0 size-96 rounded-full bg-info/10 blur-3xl"/>
                    <div className="absolute bottom-0 left-1/2 size-64 -translate-x-1/2 rounded-full bg-movies/10 blur-3xl"/>
                </div>

                <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center justify-center px-6 py-16 lg:px-8">
                    <div className="flex max-w-4xl flex-col items-center gap-6 text-center">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="h-px w-8 bg-brand" aria-hidden="true"/>
                            Your media. One living archive.
                            <span className="h-px w-8 bg-brand" aria-hidden="true"/>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                            One home for <span className="font-serif font-normal italic text-brand">everything</span> you watch,
                            read, and play.
                        </h1>
                        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance sm:text-xl">
                            Build lists across movies, series, anime, games, books, and manga. Track progress, uncover your
                            habits, and share a profile that feels yours.
                        </p>

                        <div className="flex flex-wrap justify-center gap-3">
                            <Button size="lg" onClick={() => openRegister("/")}>
                                <Popcorn data-icon="inline-start"/>
                                Create your free account
                            </Button>
                            {randomProfile &&
                                <Link
                                    to="/profile/$username"
                                    params={{ username: randomProfile.name }}
                                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                                >
                                    Explore a public profile
                                    <ArrowRight data-icon="inline-end"/>
                                </Link>
                            }
                        </div>

                        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            {["Free", "No ads", "Export anytime"].map((item) =>
                                <li key={item} className="flex items-center gap-1.5">
                                    <Check className="size-4 text-brand" aria-hidden="true"/>
                                    {item}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </section>

            <section id="features" className="container mx-auto scroll-mt-20 px-6 py-24">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
                    <Badge variant="outline">Inside MyLists</Badge>
                    <h2 className="text-3xl font-bold text-balance md:text-5xl">
                        Built for the whole habit, not just the checklist.
                    </h2>
                    <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
                        Keep every medium organized, understand the time you spend with it, and decide how social—or
                        competitive—you want the experience to be.
                    </p>
                </div>

                <div className="mx-auto mt-12 grid max-w-6xl gap-4 lg:grid-cols-12">
                    <Card className="relative bg-card/60 lg:col-span-7">
                        <CardHeader className="relative">
                            <Badge variant="success">
                                <LayoutGrid data-icon="inline-start"/>
                                Unified library
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16 md:text-3xl">
                                <h3>Six media types. One identity.</h3>
                            </CardTitle>
                            <CardDescription className="max-w-xl text-base leading-relaxed">
                                Movies, series, anime, games, books, and manga each keep their own list while contributing
                                to one profile and one set of statistics.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden font-serif text-5xl text-muted-foreground/20 sm:block">
                                01
                            </span>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-wrap gap-2" aria-label="Supported media types">
                                {["Movies", "Series", "Anime", "Games", "Books", "Manga"].map((mediaType) =>
                                    <li key={mediaType}>
                                        <Badge variant="outline">{mediaType}</Badge>
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="relative bg-card/40 lg:col-span-5">
                        <CardHeader className="relative">
                            <Badge variant="achievement">
                                <Trophy data-icon="inline-start"/>
                                Gamification
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16"><h3>Progress that feels rewarding.</h3></CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                                Logged progress builds XP, levels, and achievements—with the Hall of Fame there when you
                                feel competitive.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden font-serif text-5xl text-muted-foreground/20 sm:block">
                                02
                            </span>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-wrap gap-2">
                                {["Levels", "Achievements", "Leaderboards"].map((item) =>
                                    <li key={item}>
                                        <Badge variant="outline">
                                            {item}
                                        </Badge>
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="relative bg-card/40 lg:col-span-5">
                        <CardHeader className="relative">
                            <Badge variant="info">
                                <Users data-icon="inline-start"/>
                                Community
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16">
                                <h3>Social when you want it.</h3>
                            </CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                                Follow friends, share lists, compare statistics, and discover what people you trust are
                                enjoying—without making community features mandatory.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden font-serif text-5xl text-muted-foreground/20 sm:block">
                                03
                            </span>
                        </CardHeader>
                    </Card>

                    <Card className="relative bg-card/60 lg:col-span-7">
                        <CardHeader className="relative">
                            <Badge variant="warning">
                                <Popcorn data-icon="inline-start"/>
                                Daily challenge
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16 md:text-3xl">
                                <h3>One more reason to come back tomorrow.</h3>
                            </CardTitle>
                            <CardDescription className="max-w-xl text-base leading-relaxed">
                                Moviedle turns a pixelated cover into a daily movie challenge. Guess the title and keep
                                your streak alive.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden font-serif text-5xl text-muted-foreground/20 sm:block">
                                04
                            </span>
                        </CardHeader>
                        <CardFooter>
                            <Link to="/moviedle" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                                Play today's Moviedle
                                <ArrowRight data-icon="inline-end"/>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            </section>

            <section id="principles" className="border-y border-border/50 bg-muted/10 py-20">
                <div className="container mx-auto grid gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
                    <div className="flex max-w-lg flex-col items-start gap-5">
                        <Badge variant="outline">What you can count on</Badge>
                        <h2 className="text-3xl font-bold text-balance md:text-5xl">
                            Useful without holding your archive hostage.
                        </h2>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                            The important promises should be simple enough to state plainly—and concrete enough to verify.
                        </p>
                    </div>

                    <ul>
                        {trustPrinciples.map((principle, index) => {
                            const Icon = principle.icon;

                            return (
                                <li key={principle.title}>
                                    <article
                                        className={cn(
                                            "grid gap-4 sm:grid-cols-[10rem_1fr] sm:gap-8",
                                            index === 0 ? "pt-0" : "pt-6",
                                            index === trustPrinciples.length - 1 ? "pb-0" : "pb-6",
                                        )}
                                    >
                                        <div>
                                            <Badge variant={principle.variant}>
                                                <Icon data-icon="inline-start"/>
                                                {principle.badge}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col items-start gap-2">
                                            <h3 className="text-xl font-semibold">
                                                {principle.title}
                                            </h3>
                                            <p className="leading-relaxed text-muted-foreground">
                                                {principle.description}
                                            </p>
                                            {"href" in principle &&
                                                <a
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    href={principle.href}
                                                    className={cn("-ml-2", buttonVariants({ variant: "hover", size: "sm" }))}
                                                >
                                                    View the source
                                                    <ArrowUpRight data-icon="inline-end"/>
                                                </a>
                                            }
                                        </div>
                                    </article>
                                    {index < trustPrinciples.length - 1 && <Separator/>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </section>

            <section id="faq" className="container mx-auto scroll-mt-20 px-6 py-24">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.62fr_1fr] lg:gap-20">
                    <div className="flex max-w-lg flex-col items-start gap-5">
                        <Badge variant="outline">
                            <Lightbulb data-icon="inline-start"/>
                            FAQ
                        </Badge>
                        <h2 className="text-3xl font-bold text-balance md:text-5xl">
                            The practical questions, answered plainly.
                        </h2>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                            Start with the essentials, then dig into imports, development, and feature requests.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {faqs.map((faq, index) =>
                            <details
                                key={faq.question}
                                name="homepage-faq"
                                className="group rounded-xl border bg-card/40 transition-colors open:bg-card/70"
                            >
                                <summary className="grid cursor-pointer list-none grid-cols-[2rem_1fr_auto] items-start gap-3 rounded-xl
                                    px-5 py-4 text-left font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2
                                    focus-visible:ring-ring/50">
                                    <span aria-hidden="true" className="font-serif text-sm text-muted-foreground/60">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <span>{faq.question}</span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                                    />
                                </summary>
                                <div className="pr-12 pb-5 pl-16 text-sm leading-relaxed text-muted-foreground">
                                    {faq.answer}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            </section>

            <section
                aria-labelledby="closing-cta-title"
                className="relative -mb-20 -ml-2 w-[calc(100%+1rem)] overflow-hidden border-t border-border/60 bg-muted/10
                    sm:left-[calc(-50vw+50%)] sm:ml-0 sm:w-[99.7vw]"
            >
                <div aria-hidden="true" className="absolute inset-0">
                    <div className="absolute -top-32 left-1/4 size-80 rounded-full bg-brand/10 blur-3xl"/>
                    <div className="absolute right-0 bottom-0 size-72 rounded-full bg-info/10 blur-3xl"/>
                </div>

                <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:px-8 lg:py-24">
                    <div className="flex max-w-2xl flex-col items-start gap-5">
                        <Badge variant="outline">
                            <Sparkles data-icon="inline-start"/>
                            Ready when you are
                        </Badge>
                        <h2 id="closing-cta-title" className="text-4xl font-bold text-balance md:text-5xl">
                            Your media history is worth keeping.
                        </h2>
                        <p className="text-lg leading-relaxed text-muted-foreground text-balance">
                            Give every movie night, finished book, completed game, and new discovery one lasting home—built
                            around your taste, not a single medium.
                        </p>
                    </div>

                    <Card className="bg-background/80 shadow-sm backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                <h3>Start with your own archive.</h3>
                            </CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                                Everything important is included from the beginning.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-col gap-3 text-sm">
                                {["All core features included", "No ads or premium tier", "CSV export whenever you want"].map((item) =>
                                    <li key={item} className="flex items-center gap-2">
                                        <Check className="size-4 text-brand" aria-hidden="true"/>
                                        {item}
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-3">
                            <Button size="lg" onClick={() => openRegister("/")}>
                                <Sparkles data-icon="inline-start"/>
                                Create your free account
                            </Button>
                            {randomProfile &&
                                <Link
                                    to="/profile/$username"
                                    params={{ username: randomProfile.name }}
                                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
                                >
                                    Explore a public profile
                                    <ArrowRight data-icon="inline-end"/>
                                </Link>
                            }
                        </CardFooter>
                    </Card>
                </div>
            </section>
        </>
    );
}
