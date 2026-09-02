import {BookOpenCheck} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {LinkSidebarItem} from "@/lib/client/components/general/LinkSidebar";
import {OnboardingNav} from "@/lib/client/components/onboarding/OnBoardingShared";
import {createFileRoute, Link, Outlet, useLocation} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout")({
    component: SidebarLayout,
});


const sidebarItems: LinkSidebarItem[] = [
    {
        id: "search",
        label: "Search for media",
        to: "/walkthrough/search-media",
    },
    {
        id: "add",
        label: "Add media",
        to: "/walkthrough/add-media",
    },
    {
        id: "activate",
        label: "Activate lists",
        to: "/walkthrough/activate-lists",
    },
    {
        id: "manageLists",
        label: "Manage your lists",
        to: "/walkthrough/manage-lists",
    },
    {
        id: "comingNext",
        label: "Coming next",
        to: "/walkthrough/coming-next",
    },
    {
        id: "profile",
        label: "Profile & social",
        to: "/walkthrough/profile",
    },
    {
        id: "and-more",
        label: "Explore more",
        to: "/walkthrough/and-more",
    },
];


function SidebarLayout() {
    const { currentUser } = useAuth();
    const { pathname } = useLocation();
    if (!currentUser) return null;

    const currentStepIndex = sidebarItems.findIndex((item) => pathname === item.to);
    const activeStepIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

    return (
        <PageTitle title="How to use MyLists" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="How to use MyLists"
                    eyebrow="Getting started"
                    eyebrowIcon={BookOpenCheck}
                    asideLabel="Your progress"
                    asideValue={`Step ${activeStepIndex + 1} of ${sidebarItems.length}`}
                    description="A quick tour of tracking media, organizing lists and setting up your profile."
                    navigation={
                        <div
                            role="progressbar"
                            aria-label="Walkthrough progress"
                            aria-valuemin={1}
                            aria-valuemax={sidebarItems.length}
                            aria-valuenow={activeStepIndex + 1}
                            className="grid grid-cols-7 gap-1"
                        >
                            {sidebarItems.map((item, index) =>
                                <span
                                    key={item.id}
                                    className={index <= activeStepIndex ? "h-1 rounded-full bg-brand" : "h-1 rounded-full bg-border"}
                                />
                            )}
                        </div>
                    }
                />

                <div className="grid w-full min-w-0 gap-8 pt-6 md:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
                    <aside className="sticky top-14 z-10 min-w-0 self-start bg-background/95 backdrop-blur-sm md:top-25">
                        <nav
                            aria-label="Walkthrough steps"
                            className="flex gap-1 overflow-x-auto border-b pb-3 scrollbar-thin md:flex-col md:overflow-visible md:border-b-0 md:border-r md:pb-0 md:pr-5"
                        >
                            {sidebarItems.map((item, index) =>
                                <Link
                                    to={item.to}
                                    key={item.id}
                                    activeOptions={{ exact: true }}
                                    activeProps={{ className: "border-brand/30 bg-brand/5 text-foreground" }}
                                    className="group flex shrink-0 items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm text-muted-foreground
                                    transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40
                                    md:w-full"
                                >
                                    <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground group-aria-[current=page]:text-brand">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <span className="whitespace-nowrap font-medium">
                                        {item.label}
                                    </span>
                                </Link>
                            )}
                        </nav>
                    </aside>

                    <main className="flex min-w-0 w-full max-w-4xl flex-col">
                        <OnboardingNav
                            position="top"
                            items={sidebarItems}
                            username={currentUser.name}
                        />
                        <Outlet/>
                        <OnboardingNav
                            position="bottom"
                            items={sidebarItems}
                            username={currentUser.name}
                        />
                    </main>
                </div>
            </div>
        </PageTitle>
    );
}
