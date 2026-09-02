import {BookOpenCheck} from "lucide-react";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";


export const Route = createFileRoute("/_main/_private/settings/_layout/features-walkthrough")({
    component: FeaturesWalkthroughPage,
});


function FeaturesWalkthroughPage() {
    return (
        <section className="flex max-w-2xl items-center justify-between gap-6 rounded-xl border p-5 max-sm:flex-col max-sm:items-start">
            <div className="flex items-start gap-3">
                <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true"/>
                <div>
                    <h3 className="font-medium text-foreground">
                        Take the guided tour
                    </h3>
                    <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                        Revisit the essentials for searching, building lists and navigating your profile.
                    </p>
                </div>
            </div>

            <Link to="/walkthrough/search-media" className={buttonVariants({ className: "w-fit" })}>
                Start walkthrough
            </Link>
        </section>
    );
}
