import {clientEnv} from "@/env/client";
import {FaGithub} from "react-icons/fa";
import {createFileRoute} from "@tanstack/react-router";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {CircleUserRound, Code2, Database, ExternalLink, Info, Mail, Palette} from "lucide-react";


export const Route = createFileRoute("/_main/_universal/about")({
    head: () => ({
        links: addSeoLinks({ canonical: "/about" }),
        meta: addSeo({
            canonical: "/about",
            image: "/logo512.png",
            title: "About MyLists - Open source media tracking",
            description: "Learn about MyLists, an open source media tracking project for organizing series, anime, movies, games, books and manga.",
        }),
    }),
    component: AboutPage,
});


function AboutPage() {
    return (
        <PageTitle title="About MyLists" onlyHelmet>
            <div className="mb-16 flex flex-col pt-8">
                <PageHeader
                    asideIcon={Code2}
                    asideLabel="Made by"
                    title="About MyLists"
                    eyebrowIcon={CircleUserRound}
                    eyebrow="A little about the site"
                    asideValue="One person · open source"
                    description="Why I built MyLists, what it runs on and where its media data comes from."
                />

                <section className="mt-6 grid grid-cols-[minmax(13rem,0.34fr)_minmax(0,1fr)] gap-10 rounded-xl border p-5 shadow-xs
                max-lg:grid-cols-1 max-lg:gap-5 sm:p-7">
                    <div>
                        <div className="text-sm font-semibold text-brand">
                            01
                        </div>
                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                            A personal tracker,<br className="max-lg:hidden"/> shared publicly
                        </h2>
                    </div>

                    <div className="max-w-2xl">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            MyLists is maintained by one person in France. I started it in my free time to help my friends
                            and me keep track of series, anime, movies, games, books, and manga in one place.
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            Constructive feedback, bug reports, and contributions are always welcome—the project keeps
                            improving through the people who use it.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <a
                                href={`mailto:${clientEnv.VITE_CONTACT_MAIL}`}
                                className={buttonVariants()}
                            >
                                <Mail data-icon="inline-start"/>
                                Contact me
                            </a>
                            <a
                                target="_blank"
                                rel="noopener noreferrer"
                                href="https://github.com/Crossoufire/MyLists"
                                className={buttonVariants({ variant: "outline" })}
                            >
                                <FaGithub data-icon="inline-start"/>
                                View source
                            </a>
                        </div>
                    </div>
                </section>

                <section className="pt-12">
                    <div className="flex items-end justify-between gap-6 pb-6 max-sm:flex-col max-sm:items-start max-sm:gap-2">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                                <Code2 className="size-4" aria-hidden="true"/>
                                Technology
                            </div>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Core stack</h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                The open-source tools used to build and run MyLists.
                            </p>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">04 projects</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <TechCard
                            title="Bun"
                            href="https://bun.sh/"
                            description="Fast all-in-one JavaScript runtime"
                            licenseHref="https://github.com/oven-sh/bun/blob/main/LICENSE"
                        />
                        <TechCard
                            title="TanStack Start"
                            href="https://tanstack.com/start"
                            description="Full-stack React framework for the modern web"
                            licenseHref="https://github.com/TanStack/router/blob/main/LICENSE"
                        />
                        <TechCard
                            title="React"
                            href="https://react.dev/"
                            description="Library for web and native user interfaces"
                            licenseHref="https://github.com/facebook/react/blob/main/LICENSE"
                        />
                        <TechCard
                            title="Shadcn UI"
                            href="https://ui.shadcn.com/"
                            licenseHref="https://github.com/shadcn-ui/ui/blob/main/LICENSE.md"
                            description="Components built with accessible primitives and Tailwind CSS"
                        />
                    </div>
                </section>

                <section className="pt-12">
                    <div className="flex items-end justify-between gap-6 pb-6 max-sm:flex-col max-sm:items-start max-sm:gap-2">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                                <Database className="size-4" aria-hidden="true"/>
                                Catalogs
                            </div>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Data sources & APIs</h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                The external catalogs that supply media metadata across MyLists.
                            </p>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">04 providers</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <ApiCard
                            title="TMDB API"
                            href="https://www.themoviedb.org/"
                            apiHref="https://developer.themoviedb.org/docs"
                            description="Movie and TV show data. Not endorsed or certified by TMDB."
                        />
                        <ApiCard
                            title="IGDB API"
                            href="https://www.igdb.com/"
                            apiHref="https://api-docs.igdb.com/"
                            description="Video game database by Twitch. Not endorsed or certified by IGDB."
                        />
                        <ApiCard
                            title="Google Books API"
                            href="https://books.google.com/"
                            apiHref="https://developers.google.com/books/"
                            description="Comprehensive book information. Not endorsed or certified by Google."
                        />
                        <ApiCard
                            title="MyAnimeList API"
                            href="https://myanimelist.net/"
                            apiHref="https://myanimelist.net/apiconfig/references/api/v2"
                            description="Official anime and manga data. Not endorsed or certified by MyAnimeList."
                        />
                    </div>
                </section>

                <section className="mt-12 grid grid-cols-[minmax(13rem,0.34fr)_minmax(0,1fr)] gap-10 rounded-xl border p-5 shadow-xs max-lg:grid-cols-1 max-lg:gap-4 sm:p-6">
                    <div className="flex items-center gap-2 text-brand">
                        <Palette className="size-4" aria-hidden="true"/>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">Assets & credits</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        The MyLists.info logo was sourced from FreePik and created by&nbsp;
                        <a
                            href="https://fr.freepik.com/vecteurs-libre/logo-degrade-colore-initial-vecteur-m_28762027.htm"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                        >
                            logturnal <ExternalLink className="size-3"/>
                        </a>.
                    </p>
                </section>
            </div>
        </PageTitle>
    );
}


interface TechCardProps {
    href: string,
    title: string,
    description: string,
    licenseHref: string,
}


function TechCard({ title, description, href, licenseHref }: TechCardProps) {
    return (
        <article className="flex min-w-0 items-start justify-between gap-4 rounded-xl border p-5 shadow-xs">
            <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
                <a href={licenseHref} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-muted-foreground transition-colors hover:text-brand">
                    License
                </a>
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${title}`}
                    className="text-muted-foreground transition-colors hover:text-brand"
                >
                    <ExternalLink className="size-4"/>
                </a>
            </div>
        </article>
    );
}


interface ApiCardProps {
    href: string,
    title: string,
    apiHref: string,
    description: string,
}


function ApiCard({ title, description, href, apiHref }: ApiCardProps) {
    return (
        <article className="flex min-w-0 items-start justify-between gap-4 rounded-xl border p-5 shadow-xs">
            <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <div className="flex shrink-0 gap-2">
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${title} website`}
                    className="text-muted-foreground transition-colors hover:text-brand"
                >
                    <Info className="size-4"/>
                </a>
                <a
                    href={apiHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${title} documentation`}
                    className="text-muted-foreground transition-colors hover:text-brand"
                >
                    <ExternalLink className="size-4"/>
                </a>
            </div>
        </article>
    );
}
