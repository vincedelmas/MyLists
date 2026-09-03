/// <reference types="vite/client"/>
import React from "react";
import appCSS from "@/styles.css?url";
import {QueryClient} from "@tanstack/react-query";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {Toaster} from "@/lib/client/components/ui/toast";
import {Navbar} from "@/lib/client/components/navbar/Navbar";
import {Footer} from "@/lib/client/components/general/Footer";
import {useNProgress} from "@/lib/client/hooks/use-nprogress";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {TooltipProvider} from "@/lib/client/components/ui/tooltip";
import {PwaNavControls} from "@/lib/client/components/general/PwaNavControls";
import {AuthSessionSync} from "@/lib/client/components/general/AuthSessionSync";
import {PostHogAuthSync} from "@/lib/client/components/general/PostHogAuthSync";
import {ConfirmDialogHost} from "@/lib/client/components/confirm/ConfirmDialogHost";
import {FeatureVoteLink} from "@/lib/client/components/feature-votes/FeatureVoteLink";
import {authMethodsOptions, authOptions} from "@/lib/client/react-query/query-options";
import {YearRecapReleaseRibbon} from "@/lib/client/components/year-recap/YearRecapReleaseRibbon";
import {ClientOnly, createRootRouteWithContext, HeadContent, Outlet, redirect, Scripts} from "@tanstack/react-router";


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    ssr: false,
    context: () => ({
        authQueryOptions: authOptions,
        authMethodsQueryOptions: authMethodsOptions,
    }),
    beforeLoad: async ({ context, location }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(context.authQueryOptions),
            context.queryClient.ensureQueryData(context.authMethodsQueryOptions),
        ]);

        const currentUser = context.queryClient.getQueryData(context.authQueryOptions.queryKey);
        if (currentUser && !currentUser.usernameConfigured && location.pathname !== "/choose-username") {
            throw redirect({
                replace: true,
                to: "/choose-username",
                search: { redirect: location.href },
            });
        }
    },
    head: () => ({
        links: [
            { rel: "stylesheet", href: appCSS },
            { rel: "icon", href: "/favicon.ico" },
            { rel: "manifest", href: "/manifest.json" },
            ...addSeoLinks({ canonical: "/" }),
        ],
        meta: [
            { charSet: "utf-8" },
            { name: "color-scheme", content: "dark" },
            { name: "theme-color", content: "#0d0d0d" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            ...addSeo({
                canonical: "/",
                image: "/logo512.png",
                title: "MyLists - Track movies, series, anime, games, books and manga",
                description: "MyLists is your all-in-one platform to organize your favorite series, movies, games, anime, books and manga.",
            }),
        ],
    }),
    component: RootComponent,
    shellComponent: RootShell,
});


function RootShell({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark" data-theme="dark" style={{ colorScheme: "dark" }}>
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
        <Scripts/>
        </body>
        </html>
    );
}


function RootComponent() {
    return (
        <ClientOnly>
            <AppShell/>

            {import.meta.env.DEV &&
                <ReactQueryDevtools
                    buttonPosition="bottom-left"
                />
            }
        </ClientOnly>
    );
}


function AppShell() {
    useNProgress();

    return (
        <TooltipProvider>
            <PostHogAuthSync/>
            <AuthSessionSync/>
            <Toaster/>
            <ConfirmDialogHost/>
            <YearRecapReleaseRibbon/>
            <Navbar/>
            <Outlet/>
            <Footer/>
            <FeatureVoteLink/>
            <PwaNavControls/>
        </TooltipProvider>
    );
}
