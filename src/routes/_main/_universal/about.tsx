import {clientEnv} from "@/env/client";
import {createFileRoute} from "@tanstack/react-router";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {Separator} from "@/lib/client/components/ui/separator";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Code2, Database, ExternalLink, Info, Mail, Palette} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


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
        <PageTitle title="About MyLists.info" subtitle="Learn more about MyLists.info and the technologies behind it.">
            <div className="flex flex-col gap-8 max-w-4xl">
                <section>
                    <p className="text-muted-foreground leading-relaxed text-justify">
                        I'm only one person (French) maintaining this website. It is a personal project developed during
                        my free time to help me and my friends keep track of series, anime, movies, games, books and manga.
                        If you have any constructive remarks, find any bugs, or want to be involved in the evolution
                        of MyLists.info, please do not hesitate to contact me.
                    </p>
                    <div className="mt-4">
                        <a
                            href={`mailto:${clientEnv.VITE_CONTACT_MAIL}`}
                            className="inline-flex items-center gap-2 text-app-accent hover:underline font-medium"
                        >
                            <Mail className="size-4"/>
                            Contact Me
                        </a>
                    </div>
                </section>

                <Separator/>

                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Code2 className="w-5 h-5 text-app-accent"/>
                        <h3 className="text-xl font-semibold">Tech Stack</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            description="Beautifully designed components built with Radix UI and Tailwind CSS"
                        />
                    </div>
                </section>

                <Separator/>

                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Database className="w-5 h-5 text-app-accent"/>
                        <h3 className="text-xl font-semibold">Data Sources & APIs</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            title="Jikan API"
                            href="https://jikan.moe/"
                            apiHref="https://jikan.moe/"
                            description="Open-source PHP MyAnimeList.net API. Not endorsed or certified by Jikan."
                        />
                        <ApiCard
                            title="MyAnimeList API"
                            href="https://myanimelist.net/"
                            apiHref="https://myanimelist.net/apiconfig/references/api/v2"
                            description="Official MyAnimeList API for anime and manga data. Not endorsed or certified by MyAnimeList."
                        />
                    </div>
                </section>

                <Separator/>

                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Palette className="w-5 h-5 text-app-accent"/>
                        <h3 className="text-xl font-semibold">Assets & Credits</h3>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Logo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                The MyLists.info logo was sourced from FreePik and created by&nbsp;
                                <a
                                    href="https://fr.freepik.com/vecteurs-libre/logo-degrade-colore-initial-vecteur-m_28762027.htm"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-app-accent hover:underline inline-flex items-center gap-1"
                                >
                                    logturnal <ExternalLink className="w-3 h-3"/>
                                </a>.
                            </p>
                        </CardContent>
                    </Card>
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
        <Card className="flex flex-col justify-between">
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    {title}
                    <a href={href} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="size-4"/>
                    </a>
                </CardTitle>
                <CardDescription className="text-xs">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <a href={licenseHref} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-app-accent hover:underline">
                    View License
                </a>
            </CardContent>
        </Card>
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
        <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                    {title}
                    <div className="flex gap-2">
                        <a href={href} target="_blank" rel="noopener noreferrer" title="Website"
                           className="text-muted-foreground hover:text-primary transition-colors">
                            <Info className="size-4"/>
                        </a>
                        <a href={apiHref} target="_blank" rel="noopener noreferrer" title="API Docs"
                           className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="size-4"/>
                        </a>
                    </div>
                </CardTitle>
                <CardDescription className="text-xs">
                    {description}
                </CardDescription>
            </CardHeader>
        </Card>
    );
}
