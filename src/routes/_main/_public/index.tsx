import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {useSuspenseQuery} from "@tanstack/react-query";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Separator} from "@/lib/client/components/ui/separator";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {randomPublicProfile} from "@/lib/client/react-query/query-options";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {ArrowRight, ArrowUpRight, Check, ChevronDown, CircleDollarSign, Code, Download, LayoutGrid, Popcorn, Shield, Sparkles, Trophy, UserRoundPlus, Users} from "lucide-react";


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
            description: "Keep track of movies, series, anime, games, books, and manga. Update your progress, see your " +
                "stats, and share your lists if you want to.",
        }),
    }),
})


const faqs = [
    {
        question: "What can I track on MyLists?",
        answer: "Movies, series, anime, games, books, and manga. Each one has its own list.",
    },
    {
        question: "Is MyLists free?",
        answer: "Yes. There are no ads or paid features.",
    },
    {
        question: "Can I keep my profile private?",
        answer: "Yes. Your profile can be public, visible only to signed-in users, or limited to approved followers.",
    },
    {
        question: "Can I export my data?",
        answer: "Yes. You can export your media lists as CSV files.",
    },
    {
        question: "Do I have to follow people or care about achievements?",
        answer: "No. You can ignore all of that and just use MyLists to keep your own lists.",
    },
    {
        question: "Will you add imports from Letterboxd, MAL, IMDb, and other sites?",
        answer:
            "They are in the works, but not available right now. I work on MyLists by myself, and imports from other sites take a lot " +
            "of work to get right.",
    },
    {
        question: "Is MyLists still actively developed?",
        answer: "Yes. I work on it regularly, though it may take a while for larger changes to make it onto the site.",
    },
    {
        question: "Can I suggest something for the site?",
        answer: (
            <>
                Yes. Once you are signed in, use the <b>lightbulb in the bottom-right corner</b> to suggest an idea or vote
                on someone else&apos;s.
            </>
        ),
    },
];

const trustPrinciples = [
    {
        icon: CircleDollarSign,
        badge: "Free",
        variant: "success",
        title: "The site is free.",
        description: "There are no ads, subscriptions, or features kept behind a payment.",
    },
    {
        icon: Shield,
        badge: "Privacy",
        variant: "info",
        title: "Your profile does not have to be public.",
        description: "You can make it public, visible only to signed-in users, or limited to approved followers.",
    },
    {
        icon: Download,
        badge: "CSV export",
        variant: "warning",
        title: "You can download your lists.",
        description: "Export any of your lists as a CSV file whenever you want a copy.",
    },
    {
        icon: Code,
        badge: "Open source",
        variant: "achievement",
        title: "The code is public.",
        description: "MyLists is made by one person, and its source code is available on GitHub.",
        href: "https://github.com/Crossoufire/MyLists",
    },
] as const;


function HomePage() {
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

                <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center justify-center px-6 pt-16 pb-24 lg:px-8">
                    <div className="flex max-w-4xl flex-col items-center gap-6 text-center">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="h-px w-10 bg-brand" aria-hidden="true"/>
                            Movies, Series, Anime, Games, Books, and Manga
                            <span className="h-px w-10 bg-brand" aria-hidden="true"/>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                            Keep track of what you <span className="text-brand">watch</span>,
                            read, and play.
                        </h1>
                        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance sm:text-xl">
                            Make lists, update your progress, and see a few stats along the way. You can keep it to yourself
                            or share it with other people.
                        </p>

                        <div className="flex flex-wrap justify-center gap-3">
                            <Link
                                to="/register"
                                search={{ redirect: "/" }}
                                className={buttonVariants({ size: "lg" })}
                            >
                                <Popcorn data-icon="inline-start"/>
                                Create an account
                            </Link>
                            {randomProfile &&
                                <Link
                                    to="/profile/$username"
                                    params={{ username: randomProfile.name }}
                                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                                >
                                    See a random profile
                                    <ArrowRight data-icon="inline-end"/>
                                </Link>
                            }
                        </div>

                        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            {["Free to use", "No ads", "CSV export"].map((item) =>
                                <li key={item} className="flex items-center gap-1.5">
                                    <Check className="size-4 text-brand" aria-hidden="true"/>
                                    {item}
                                </li>
                            )}
                        </ul>
                    </div>

                    <a
                        href="#features"
                        aria-label="Scroll to the next section"
                        className="absolute bottom-6 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full
                            border border-border/70 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-sm
                            transition-colors hover:border-border hover:text-foreground focus-visible:outline-none
                            focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <ChevronDown aria-hidden="true" className="size-6 motion-safe:animate-bounce"/>
                    </a>
                </div>
            </section>

            <section id="features" className="container mx-auto scroll-mt-15 px-6 py-24">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
                    <h2 className="text-3xl font-bold text-balance md:text-5xl">
                        Keep a list, update it, and see the numbers.
                    </h2>
                    <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
                        The stats, achievements, and social parts are there if you want them. If not, you can just keep
                        track of what you have watched, read, or played.
                    </p>
                </div>

                <div className="mx-auto mt-12 grid max-w-6xl gap-4 lg:grid-cols-12">
                    <Card className="relative bg-card/60 lg:col-span-7">
                        <CardHeader className="relative">
                            <Badge variant="success">
                                <LayoutGrid data-icon="inline-start"/>
                                Your lists
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16 md:text-3xl">
                                <h3>A separate list for each kind of media.</h3>
                            </CardTitle>
                            <CardDescription className="max-w-xl text-base leading-relaxed">
                                Movies, series, anime, games, books, and manga each have their own list. They all show up
                                on the same profile and in the same stats.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden text-5xl text-muted-foreground/20 sm:block">
                                01
                            </span>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-wrap gap-3" aria-label="Supported media types">
                                {Object.values(MediaType).map((mediaType) =>
                                    <li key={mediaType}>
                                        <Badge variant="outline" className="capitalize">
                                            <MainThemeIcon type={mediaType} dataIcon="inline-start"/>
                                            {mediaType}
                                        </Badge>
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="relative bg-card/40 lg:col-span-5">
                        <CardHeader className="relative">
                            <Badge variant="achievement">
                                <Trophy data-icon="inline-start"/>
                                Achievements
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16">
                                <h3>Levels and achievements, if you are into that.</h3>
                            </CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                                Updating your progress earns XP and achievements. There are also leaderboards if you feel
                                like comparing numbers.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden text-5xl text-muted-foreground/20 sm:block">
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
                                People
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16">
                                <h3>See what your friends are up to.</h3>
                            </CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                                Follow people to see their lists and recent updates. Or do not, the site works fine as a
                                private tracker too.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden text-5xl text-muted-foreground/20 sm:block">
                                03
                            </span>
                        </CardHeader>
                    </Card>

                    <Card className="relative bg-card/60 lg:col-span-7">
                        <CardHeader className="relative">
                            <Badge variant="destructive">
                                Daily challenge
                            </Badge>
                            <CardTitle className="text-2xl sm:pr-16 md:text-3xl">
                                <h3>There are also some small games.</h3>
                            </CardTitle>
                            <CardDescription className="max-w-xl text-base leading-relaxed">
                                Moviedle shows you a pixelated movie cover. Guess the title in as few tries as you can.
                                Which came first? Find which media released first between the two dates.
                            </CardDescription>
                            <span aria-hidden="true" className="absolute top-0 right-4 hidden text-5xl text-muted-foreground/20 sm:block">
                                04
                            </span>
                        </CardHeader>
                        <CardFooter className="flex items-center gap-2">
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
                        <h2 className="text-3xl font-bold text-balance md:text-5xl">
                            A few things before you sign up.
                        </h2>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                            MyLists is free, open source, and made by one person.
                        </p>
                    </div>

                    <ul>
                        {trustPrinciples.map((principle, index) => {
                            const Icon = principle.icon;

                            return (
                                <li key={principle.title}>
                                    <article
                                        className={cn(
                                            "grid sm:grid-cols-[10rem_1fr]",
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
                        <h2 className="text-3xl font-bold text-balance md:text-5xl">
                            Questions people usually have.
                        </h2>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                            A few more details about privacy, imports, and how the site is run.
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
                            Want to try it?
                        </Badge>
                        <h2 id="closing-cta-title" className="text-4xl font-bold text-balance md:text-5xl">
                            Make a list and see if you like it.
                        </h2>
                        <p className="text-lg leading-relaxed text-muted-foreground text-balance">
                            Start with a few titles. You can add the rest whenever you feel like it.
                        </p>
                    </div>

                    <Card className="bg-background/80 shadow-sm backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                <h3>Create an account</h3>
                            </CardTitle>
                            <CardDescription className="text-base leading-relaxed">
                                Then choose which lists you want to use.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-col gap-3 text-sm">
                                {["Free to use", "Public or private profile", "Downloadable CSV lists"].map((item) =>
                                    <li key={item} className="flex items-center gap-2">
                                        <Check className="size-4 text-brand" aria-hidden="true"/>
                                        {item}
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-3">
                            <Link
                                to="/register"
                                search={{ redirect: "/" }}
                                className={buttonVariants({ size: "lg" })}
                            >
                                <UserRoundPlus data-icon="inline-start"/>
                                Create an account
                            </Link>
                            {randomProfile &&
                                <Link
                                    to="/profile/$username"
                                    params={{ username: randomProfile.name }}
                                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
                                >
                                    See a random profile
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
