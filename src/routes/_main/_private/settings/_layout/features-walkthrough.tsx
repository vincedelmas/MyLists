import React from "react";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";


export const Route = createFileRoute("/_main/_private/settings/_layout/features-walkthrough")({
    component: FeaturesWalkthroughPage,
});


function FeaturesWalkthroughPage() {
    return (
        <div className="flex flex-col h-fit max-w-125 gap-5 rounded-xl bg-popover/50 border p-6">
            <div>
                <h3 className="text-base font-bold">
                    Feature Walkthrough
                </h3>
                <p className="text-sm mt-1 max-w-xl">
                    New to the platform? Replay the tutorial to learn how
                    to navigate the app and use our main features.
                </p>
            </div>

            <Link to="/walkthrough/search-media" className={buttonVariants({ className: "w-fit mx-auto" })}>
                Start Tutorial
            </Link>
        </div>
    );
}
