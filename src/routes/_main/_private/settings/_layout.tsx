import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {createFileRoute, Link, Outlet, useLocation} from "@tanstack/react-router";
import {BookOpenCheck, Brush, CircleUserRound, KeyRound, LibraryBig, ListRestart, Settings2, ShieldAlert,} from "lucide-react";


export const Route = createFileRoute("/_main/_private/settings/_layout")({
    component: SettingsLayout,
});


const settingsItems = [
    {
        id: "general",
        label: "General",
        icon: CircleUserRound,
        to: "/settings/general",
        description: "Identity, images and privacy",
    },
    {
        icon: LibraryBig,
        id: "content-lists",
        label: "Content & Lists",
        to: "/settings/content-lists",
        description: "Media types, ratings and exports",
    },
    // {
    //     id: "imports",
    //     label: "Imports",
    //     to: "/settings/imports",
    // },
    {
        icon: Brush,
        id: "profile-customization",
        label: "Profile Customization",
        to: "/settings/profile-customization",
        description: "Highlighted media on your profile",
    },
    {
        icon: ListRestart,
        id: "activity-cleanup",
        label: "Activity Cleanup",
        to: "/settings/activity-cleanup",
        description: "Hide imported activity in bulk",
    },
    {
        icon: KeyRound,
        id: "email-password",
        label: "Email & Password",
        to: "/settings/email-password",
        description: "Sign-in details and security",
    },
    {
        icon: BookOpenCheck,
        id: "features-walkthrough",
        label: "Features Walkthrough",
        to: "/settings/features-walkthrough",
        description: "Replay the MyLists tour",
    },
    {
        id: "danger",
        icon: ShieldAlert,
        label: "Danger Zone",
        to: "/settings/danger",
        description: "Permanent account actions",
    },
] as const;


function SettingsLayout() {
    const { pathname } = useLocation();
    const activeItem = settingsItems.find((item) => pathname === item.to) ?? settingsItems[0];
    const ActiveIcon = activeItem.icon;

    return (
        <PageTitle title="Settings" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="Settings"
                    eyebrow="Your account"
                    asideIcon={ActiveIcon}
                    eyebrowIcon={Settings2}
                    asideLabel="You’re viewing"
                    asideValue={activeItem.label}
                    description="Change how your account, profile and lists work."
                />

                <div className="grid w-full min-w-0 gap-8 pt-6 md:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
                    <aside className="sticky top-14 z-10 min-w-0 self-start bg-background/95 backdrop-blur-sm md:top-25">
                        <nav
                            aria-label="Settings sections"
                            className="flex gap-1 overflow-x-auto border-b pb-3 scrollbar-thin md:flex-col md:overflow-visible
                            md:border-b-0 md:border-r md:pb-0 md:pr-5"
                        >
                            {settingsItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <Link
                                        to={item.to}
                                        key={item.id}
                                        activeOptions={{ exact: true }}
                                        activeProps={{ className: "border-brand/30 bg-brand/5 text-foreground" }}
                                        className="group flex shrink-0 items-center gap-3 rounded-lg border border-transparent px-3 py-2.5
                                        text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:w-full"
                                    >
                                        <Icon
                                            aria-hidden="true"
                                            className="size-4 shrink-0 transition-colors group-aria-[current=page]:text-brand"
                                        />
                                        <span className="min-w-0">
                                            <span className="block whitespace-nowrap font-medium">
                                                {item.label}
                                            </span>
                                            <span className="mt-0.5 hidden text-xs font-normal leading-snug text-muted-foreground md:block">
                                                {item.description}
                                            </span>
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    <main className="w-full min-w-0 max-w-4xl">
                        <header className="mb-6 flex items-start gap-3 border-b pb-4">
                            <div className="min-w-0">
                                <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                                    <ActiveIcon className="size-5 shrink-0 text-brand" aria-hidden="true"/>
                                    {activeItem.label}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {activeItem.description}
                                </p>
                            </div>
                        </header>
                        <Outlet/>
                    </main>
                </div>
            </div>
        </PageTitle>
    );
}
