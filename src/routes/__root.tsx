/// <reference types="vite/client"/>
import React from "react";
import appCSS from "@/styles.css?url";
import {clientEnv} from "@/env/client";
import {PostHogProvider} from "posthog-js/react";
import {QueryClient} from "@tanstack/react-query";
import {addSeo, addSeoLinks} from "@/lib/utils/add-seo";
import {Toaster} from "@/lib/client/components/ui/sonner";
import {Navbar} from "@/lib/client/components/navbar/Navbar";
import {useNProgress} from "@/lib/client/hooks/use-nprogress";
import {Footer} from "@/lib/client/components/general/Footer";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {PostHogAuthSync} from "@/lib/client/components/general/PostHogAuthSync";
import {AuthSessionSync} from "@/lib/client/components/general/AuthSessionSync";
import {authOptions} from "@/lib/client/react-query/query-options";
import {AuthModalProvider} from "@/lib/client/components/general/AuthModalProvider";
import {FeatureVoteLink} from "@/lib/client/components/feature-votes/FeatureVoteLink";
import {createRootRouteWithContext, HeadContent, Outlet, Scripts} from "@tanstack/react-router";


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    ssr: false,
    beforeLoad: ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(authOptions);
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
            { name: "theme-color", content: "#020617" },
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
    shellComponent: RootComponent,
});


function RootComponent() {
    useNProgress();

    return (
        <html lang="en" className="dark" suppressHydrationWarning>
        <head>
            <HeadContent/>
        </head>
        <body>

        <PostHogProvider
            apiKey={clientEnv.VITE_PUBLIC_POSTHOG_KEY}
            options={{
                defaults: "2026-01-30",
                disable_session_recording: true,
                capture_pageview: "history_change",
                person_profiles: "identified_only",
                api_host: clientEnv.VITE_PUBLIC_POSTHOG_HOST,
                ui_host: clientEnv.VITE_PUBLIC_POSTHOG_UI_HOST,
            }}
        >
            <PostHogAuthSync/>
            <AuthSessionSync/>
            <Toaster/>
            <AuthModalProvider/>
            <Navbar/>
            <Outlet/>
            <Footer/>
            <FeatureVoteLink/>
        </PostHogProvider>

        {import.meta.env.DEV &&
            <ReactQueryDevtools buttonPosition="bottom-left"/>
        }

        <Scripts/>
        </body>
        </html>
    );
}
