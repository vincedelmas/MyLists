import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {OnboardingNav} from "@/lib/client/components/onboarding/OnBoardingShared";
import {LinkSidebar, LinkSidebarItem} from "@/lib/client/components/general/LinkSidebar";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout")({
    component: SidebarLayout,
});


const sidebarItems: LinkSidebarItem[] = [
    {
        id: "search",
        to: "/walkthrough/search-media",
        label: "Search For A Media",
    },
    {
        id: "add",
        to: "/walkthrough/add-media",
        label: "Add A Media To Your List",
    },
    {
        id: "activate",
        to: "/walkthrough/activate-lists",
        label: "Activate More Lists Type",
    },
    {
        id: "manageLists",
        label: "Managing The Lists",
        to: "/walkthrough/manage-lists",
    },
    {
        id: "comingNext",
        label: "Coming Next Media",
        to: "/walkthrough/coming-next",
    },
    {
        id: "profile",
        to: "/walkthrough/profile",
        label: "Profile & Social",
    },
    {
        id: "and-more",
        to: "/walkthrough/and-more",
        label: "And More...",
    },
];


function SidebarLayout() {
    const { currentUser } = useAuth();
    if (!currentUser) return null;

    return (
        <PageTitle title="How to use MyLists.info" subtitle="Here to guide you how to use mylists.info :).">
            <div className="flex flex-col md:grid md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr] gap-6 md:gap-10 mt-2 w-full max-w-full">
                <aside className="sticky top-14 md:top-25 self-start z-10 bg-background pt-2 min-w-0 w-full">
                    <LinkSidebar
                        items={sidebarItems}
                    />
                </aside>

                <main className="min-w-0 w-full flex flex-col max-w-3xl mt-2">
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
        </PageTitle>
    );
}
