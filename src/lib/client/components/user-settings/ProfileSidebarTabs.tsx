import {cn} from "@/lib/utils/classnames";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {HighlightedMediaTab, PROFILE_MAX_HIGHLIGHTED_MEDIA} from "@/lib/types/profile-custom.types";


interface ProfileSidebarTabsProps {
    allFormValues: any;
    activeTab: HighlightedMediaTab;
    setActiveTab: (tab: HighlightedMediaTab) => void;
}


export const ProfileSidebarTabs = ({ activeTab, setActiveTab, allFormValues }: ProfileSidebarTabsProps) => {
    const { currentUser } = useAuth();
    const allTabs = ["overview", ...getActiveMediaTypes(currentUser!.settings)] as const;

    return (
        <div className="space-y-2 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2">
            {allTabs.map((tab) => {
                const tabConfig = allFormValues[tab];
                const tabMode = tabConfig?.mode ?? "random";
                const tabItemsCount = tabConfig?.items?.length ?? 0;

                return (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn("w-full rounded-lg border p-3 text-left transition-colors",
                            activeTab === tab ? "border-brand bg-brand/10" : "hover:bg-accent/40",
                        )}
                    >
                        <div className="flex items-center gap-2 font-medium capitalize">
                            <MainThemeIcon type={tab} size={16}/>
                            {tab}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground capitalize">
                            {tabMode === "curated"
                                ? <>{tabMode} - {tabItemsCount}/{PROFILE_MAX_HIGHLIGHTED_MEDIA}</>
                                : <>{tabMode}</>
                            }
                        </div>
                    </button>
                );
            })}
        </div>
    )
}
