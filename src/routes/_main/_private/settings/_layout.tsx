import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {LinkSidebar, LinkSidebarItem} from "@/lib/client/components/general/LinkSidebar";


export const Route = createFileRoute("/_main/_private/settings/_layout")({
    component: SettingsLayout,
});


const sidebarItems: LinkSidebarItem[] = [
    {
        id: "general",
        label: "General",
        to: "/settings/general",
    },
    {
        id: "content-lists",
        label: "Content & Lists",
        to: "/settings/content-lists",
    },
    {
        id: "imports",
        label: "Imports",
        to: "/settings/imports",
    },
    {
        id: "profile-customization",
        label: "Profile Customization",
        to: "/settings/profile-customization",
    },
    {
        id: "activity-cleanup",
        label: "Activity Cleanup",
        to: "/settings/activity-cleanup",
    },
    {
        id: "email-password",
        label: "Email & Password",
        to: "/settings/email-password",
    },
    {
        id: "features-walkthrough",
        label: "Features Walkthrough",
        to: "/settings/features-walkthrough",
    },
    {
        id: "danger",
        label: "Danger",
        to: "/settings/danger",
    },
];


function SettingsLayout() {
    return (
        <PageTitle title="Settings" subtitle="Customize Your Profile: Manage Your Preferences and Account Settings">
            <div className="flex flex-col md:grid md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr] gap-6 md:gap-10 mt-6 w-full max-w-full">
                <aside className="sticky top-14 md:top-25 self-start z-10 bg-background pt-2 min-w-0 w-full">
                    <LinkSidebar items={sidebarItems}/>
                </aside>

                <main className="w-full min-w-0 max-w-5xl">
                    <Outlet/>
                </main>
            </div>
        </PageTitle>
    );
}
