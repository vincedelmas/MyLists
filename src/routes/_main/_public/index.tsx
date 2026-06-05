import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ArrowRight, Bug, ChevronDown, Code, Heart, LayoutGrid, Lightbulb, Monitor, Popcorn, Shield, Sprout, Trophy, Users} from "lucide-react";


export const Route = createFileRoute("/_main/_public/")({
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
    component: HomePage,
})


const faqs = [
    {
        question: "Will you add importers from Letterboxd, MAL, IMDb, and similar platforms?",
        answer:
            "Not for now. MyLists is a solo project, and I would rather build imports properly than ship something fragile. " +
            "Some third-party services also have rate-limit and data-mapping constraints, so this needs more work " +
            "before it is worth releasing.",
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
    {
        question: "Is MyLists free?",
        answer: "Yes. There are no ads, no premium tier, and no locked core features.",
    },
    {
        question: "What can I track on MyLists?",
        answer: "Movies, series, anime, games, books, and manga in one account.",
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
        question: "Is MyLists still actively developed?",
        answer: "Yes. It is actively maintained, but as a solo project features are prioritized carefully and shipped progressively.",
    },
    {
        question: "Do I need to use the social or gamification features?",
        answer: "No. You can use MyLists as a simple personal tracker, or also use the community, achievements, and leaderboards if that is your thing.",
    },
];

const features = [
    {
        icon: <Monitor className="size-6"/>,
        title: "Fully Responsive",
        description: "Perfect experience across all devices: desktop, tablet, and mobile.",
    },
    {
        icon: <Code className="size-6"/>,
        title: "Open Source",
        description: "Completely open source built with modern technologies. Contribute on GitHub and help improve the platform.",
    },
    {
        icon: <Shield className="size-6"/>,
        title: "100% Free",
        description: "No ads, no premium tiers, no hidden costs. Just create an account and access everything for free.",
    },
    {
        icon: <Bug className="size-6"/>,
        title: "Community Support",
        description: "Found an issue? Have suggestions? We're here to help and constantly improving based on feedback.",
    },
    {
        icon: <Heart className="size-6"/>,
        title: "Passion Project",
        description: "Made by one person, I hope you will like it. If you have any suggestions, do not hesitate to contact me.",
    },
    {
        icon: <Sprout className="size-6"/>,
        title: "Always Evolving",
        description: "Regular updates with new features, improvements, and integrations. Stay tuned!",
    },
];


function HomePage() {
    return (
        <PageTitle title="HomePage" onlyHelmet>
            <section className="relative flex flex-col items-center justify-center bg-cover h-150 w-[99.7vw] left-[calc(-50vw+50%)] max-sm:h-87">
                <div className="absolute inset-0 bg-linear-to-br from-background via-background/90 to-background/80">
                    <div className="absolute inset-0 opacity-20">
                        <div className="grid grid-cols-8 gap-1 h-full">
                            {Array.from({ length: 32 }).map((_, i) =>
                                <div
                                    key={i}
                                    style={{ animationDelay: `${i * Math.random()}s` }}
                                    className="bg-linear-to-br from-primary/20 to-accent/20 rounded-lg float-animation"
                                />
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 relative z-10 text-center space-y-8 px-4">
                    <h1 className="text-4xl md:text-6xl font-bold text-balance">
                        Welcome to MyLists
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance">
                        Track all your media in one place, manage your lists, track time spent,
                        and follow other enthusiasts in one beautiful platform
                    </p>
                    <Link to="/profile/$username" params={{ username: "DemoProfile" }}>
                        <Button variant="emeraldy" size="lg" className="gap-2">
                            Demo Profile <ArrowRight/>
                        </Button>
                    </Link>
                </div>
            </section>

            <div className="flex flex-col gap-24 py-24 container mx-auto px-6">

                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="order-2 md:order-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            <LayoutGrid className="size-4"/>
                            <span>Unified Library</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">
                            All Your Media in One Place
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Stop switching between different apps. Track your Movies, Series, Anime, Games, Books, and Manga
                            all in one beautiful, organized dashboard.
                        </p>
                        <ul className="space-y-3">
                            {["List Per Media", "Advanced Statistics", "Advanced Filtering"].map((item) => (
                                <li key={item} className="font-medium flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-primary"/>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="order-2 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-accent/50 text-sm font-medium">
                            <Trophy className="size-4"/>
                            <span>Gamification</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Level Up Your Passion
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Earn XP for every episode watched or chapter read. Unlock achievements, level up your profile,
                            and compete with the community on the global Hall of Fame.
                        </p>
                        <ul className="space-y-3">
                            {["Level System", "Unique Achievements", "Global Leaderboards"].map((item) => (
                                <li key={item} className="font-medium flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-app-accent"/>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="order-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-sm font-medium">
                            <Users className="size-4"/>
                            <span>Community</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">Connect with Friends</h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            See what your friends are watching, playing, or reading. Share your lists, compare stats, and discover new favorites based on your network's activity.
                        </p>
                    </div>
                    <div className="order-2 md:order-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-movies/70 text-sm font-medium">
                            <Popcorn className="size-4"/>
                            <span>Daily Challenge</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Daily Movie Challenge
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Think you know movies? Test your knowledge with "Moviedle", our daily pixelated cover challenge.
                            Guess the movie, keep your streak alive!
                        </p>
                    </div>
                </div>
            </div>

            <section className="border-y border-border/50 bg-muted/10 py-10">
                <div className="container mx-auto px-6">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-10 space-y-4 text-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-app-accent/15 px-3 py-1 text-sm font-medium">
                                <Lightbulb className="size-4"/>
                                <span>FAQ</span>
                            </div>
                            <h2 className="text-3xl font-bold text-balance md:text-4xl">
                                Frequently Asked Questions
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
                                Quick answers about imports, privacy, exports, and how feature requests work.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {faqs.map((faq) =>
                                <details
                                    key={faq.question}
                                    className="group rounded-xl border bg-background/80 px-5 py-4"
                                >
                                    <summary className="flex list-none items-center justify-between gap-4 text-left font-semibold marker:hidden">
                                        <span>{faq.question}</span>
                                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"/>
                                    </summary>
                                    <div className="pt-3 pr-7 text-sm leading-relaxed text-muted-foreground">
                                        {faq.answer}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-muted/10 py-12 border-y border-border/50 mt-10">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                            Why Choose MyLists?
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
                            Built with modern technology and user experience in mind
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                        {features.map((feature, idx) =>
                            <div key={idx} className="flex items-start gap-4 p-6 rounded-xl hover:bg-card transition-colors">
                                <div className="size-12 bg-app-accent/30 rounded-lg flex items-center justify-center shrink-0">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="pt-24 pb-12 px-6 text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold">
                        Ready to start your lists?
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        Join thousands of other media enthusiasts today.
                        It's free and open source.
                    </p>
                </div>
            </section>
        </PageTitle>
    );
}
