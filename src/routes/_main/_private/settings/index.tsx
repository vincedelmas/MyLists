import {createFileRoute} from "@tanstack/react-router";
import {useHashTab} from "@/lib/client/hooks/use-hash-tab";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {DangerForm} from "@/lib/client/components/user-settings/DangerForm";
import {Sidebar, SidebarItem} from "@/lib/client/components/general/Sidebar";
import {GeneralForm} from "@/lib/client/components/user-settings/GeneralForm";
import {MediaListForm} from "@/lib/client/components/user-settings/MediaListForm";
import {ProfileCustomForm} from "@/lib/client/components/user-settings/ProfileCustomForm";
import {FeaturesWalkthrough} from "@/lib/client/components/user-settings/FeaturesWalkthrough";
import {EmailAndPasswordForm} from "@/lib/client/components/user-settings/EmailAndPasswordForm";
import {ActivityCleanupSettings} from "@/lib/client/components/user-settings/ActivityCleanupSettings";


export const Route = createFileRoute("/_main/_private/settings/")({
    component: SettingsPage,
});


const tabConfig = [
    { sidebarTitle: "General", component: <GeneralForm/> },
    { sidebarTitle: "Content & Lists", component: <MediaListForm/> },
    { sidebarTitle: "Profile Customization", component: <ProfileCustomForm/> },
    { sidebarTitle: "Activity Cleanup", component: <ActivityCleanupSettings/> },
    { sidebarTitle: "Email & Password", component: <EmailAndPasswordForm/> },
    { sidebarTitle: "Features Walkthrough", component: <FeaturesWalkthrough/> },
    { sidebarTitle: "Danger", component: <DangerForm/> },
] as const;
type TabTitles = typeof tabConfig[number]["sidebarTitle"];


function SettingsPage() {
    const [activeTabTitle, setActiveTabTitle] = useHashTab<TabTitles>("General");

    const sidebarItems: SidebarItem[] = tabConfig.map((tab) => ({
        id: tab.sidebarTitle,
        label: tab.sidebarTitle,
        isActive: activeTabTitle === tab.sidebarTitle,
        onClick: () => setActiveTabTitle(tab.sidebarTitle),
    }));

    const activeTab = tabConfig.find((t) => t.sidebarTitle === activeTabTitle);

    return (
        <PageTitle title="Settings" subtitle="Customize Your Profile: Manage Your Preferences and Account Settings">
            <div className="grid md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr] gap-10 mt-6">
                <Sidebar
                    items={sidebarItems}
                />

                {activeTab?.component}
            </div>
        </PageTitle>
    );
}
