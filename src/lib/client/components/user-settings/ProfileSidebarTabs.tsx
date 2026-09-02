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
        <div className="space-y-1.5 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2 max-lg:space-y-0">
            {allTabs.map((tab) => {
                const tabConfig = allFormValues[tab];
                const tabMode = tabConfig?.mode ?? "random";
                const tabItemsCount = tabConfig?.items?.length ?? 0;

                return (
                    <button
                        key={tab}
                        type="button"
                        aria-pressed={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn("w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                            activeTab === tab
                                ? "border-brand/25 bg-brand/5 text-foreground shadow-xs"
                                : "text-muted-foreground hover:border-foreground/10 hover:bg-muted/40 hover:text-foreground",
                        )}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2 font-medium capitalize">
                                <MainThemeIcon type={tab} size={16}/>
                                <span className="truncate">{tab}</span>
                            </span>
                            <span className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
                                activeTab === tab && "border-brand/20 text-brand",
                            )}>
                                {tabMode === "curated"
                                    ? `${tabItemsCount}/${PROFILE_MAX_HIGHLIGHTED_MEDIA}`
                                    : tabMode === "disabled" ? "Hidden" : "Random"
                                }
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    )
}
