import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import type {ReactElement, ReactNode} from "react";
import {capitalize} from "@/lib/utils/formatting/text";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {getActiveMediaSettings} from "@/lib/utils/media/list-activation";
import {Award, Calendar, ChartNoAxesColumn, ChevronDown, LibraryBig, Play, Zap} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


const defaultTriggerClassName = "inline-flex items-center justify-center px-4 text-sm font-medium hover:text-brand";


const previewItemClassName = "[&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 " +
    "rounded-sm px-2 py-1.5 text-sm select-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";


interface MyMediaMenuProps {
    username: string;
    preview?: boolean;
    triggerClassName?: string;
    highlightReleaseCalendar?: boolean;
    settings: { active: boolean; mediaType: MediaType }[];
}


export const MyMediaMenu = ({ username, settings, preview = false, triggerClassName, highlightReleaseCalendar = false }: MyMediaMenuProps) => {
    const currentDate = useCurrentDate();
    const [currentYear, currentMonth] = currentDate?.split("-") ?? [];

    const content = (
        <MyMediaMenuContent
            preview={preview}
            username={username}
            settings={settings}
            currentYear={currentYear}
            currentMonth={currentMonth}
            highlightReleaseCalendar={highlightReleaseCalendar}
        />
    );

    if (preview) {
        return (
            <div className="flex max-w-full flex-col items-center gap-4">
                <div className={cn(defaultTriggerClassName, triggerClassName)}>
                    MyMedia <ChevronDown className="ml-2 size-3 opacity-70"/>
                </div>
                <div className="w-92 max-w-full overflow-hidden rounded-md border bg-background text-foreground shadow-md">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={cn(defaultTriggerClassName, triggerClassName)}>
                MyMedia <ChevronDown className="ml-2 size-3 opacity-70"/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-92 max-w-[calc(100vw-2rem)] p-0">
                {content}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


interface MyMediaMenuContentProps extends Pick<MyMediaMenuProps, "username" | "settings" | "highlightReleaseCalendar"> {
    preview: boolean;
    currentYear?: string;
    currentMonth?: string;
}


const MyMediaMenuContent = ({ preview, username, settings, currentYear, currentMonth, highlightReleaseCalendar, }: MyMediaMenuContentProps) => {
    return (
        <div className="grid lg:grid-cols-2">
            <div className="hidden bg-muted/30 px-3 pt-1 pb-2 lg:block">
                <MenuGroup preview={preview}>
                    <MenuLabel preview={preview}>
                        Tracking Lists
                    </MenuLabel>
                    {getActiveMediaSettings(settings)
                        .map((setting) =>
                            <MenuEntry
                                preview={preview}
                                key={setting.mediaType}
                                renderLink={(children) =>
                                    <Link to="/lists/tracking/$mediaType/$username" params={{ mediaType: setting.mediaType, username }}>
                                        {children}
                                    </Link>
                                }
                            >
                                <MainThemeIcon type={setting.mediaType}/>
                                {capitalize(setting.mediaType)} List
                            </MenuEntry>
                        )}
                    <MenuEntry
                        preview={preview}
                        renderLink={(children) =>
                            <Link to="/lists/continue/$username" params={{ username }}>
                                {children}
                            </Link>
                        }
                    >
                        <Play/> Continue
                    </MenuEntry>
                </MenuGroup>
            </div>

            <div className="px-3 pt-1 pb-2 lg:border-l">
                <MenuGroup
                    preview={preview}
                    className="max-lg:grid max-lg:grid-cols-2 max-lg:[&_[data-slot=dropdown-menu-item]]:min-h-16
                    max-lg:[&_[data-slot=dropdown-menu-item]]:flex-col max-lg:[&_[data-slot=dropdown-menu-item]]:justify-center
                    max-lg:[&_svg]:size-6"
                >
                    <MenuLabel preview={preview} className="max-lg:col-span-2">
                        Personal
                    </MenuLabel>
                    <MenuEntry
                        preview={preview}
                        renderLink={(children) =>
                            <Link to="/stats/$username" params={{ username }}>
                                {children}
                            </Link>
                        }
                    >
                        <ChartNoAxesColumn className="size-4"/> My Stats
                    </MenuEntry>
                    {currentYear && currentMonth &&
                        <MenuEntry
                            preview={preview}
                            renderLink={(children) =>
                                <Link
                                    params={{ username }}
                                    to="/activity/$username"
                                    search={{ year: currentYear, month: String(Number(currentMonth)) }}
                                >
                                    {children}
                                </Link>
                            }
                        >
                            <Zap className="size-4"/> My Activity
                        </MenuEntry>
                    }
                    <MenuEntry
                        preview={preview}
                        renderLink={(children) => <Link to="/release-calendar">{children}</Link>}
                        className={highlightReleaseCalendar ? "bg-brand/20 font-bold text-brand ring-1 ring-brand/30" : undefined}
                    >
                        <Calendar className="size-4"/> Release Calendar
                    </MenuEntry>
                    <MenuEntry
                        preview={preview}
                        renderLink={(children) =>
                            <Link to="/lists/$username" params={{ username }}>
                                {children}
                            </Link>
                        }
                    >
                        <LibraryBig/> Lists & collections
                    </MenuEntry>
                    <MenuEntry
                        preview={preview}
                        renderLink={(children) =>
                            <Link to="/achievements/$username" params={{ username }}>
                                {children}
                            </Link>
                        }
                    >
                        <Award className="size-4"/> My Achievements
                    </MenuEntry>
                </MenuGroup>
            </div>
        </div>
    );
}


const MenuLabel = ({ preview, children, className }: { preview: boolean; className?: string; children: ReactNode }) => {
    if (preview) {
        return (
            <div className={cn("mb-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground", className)}>
                {children}
            </div>
        );
    }

    return (
        <DropdownMenuLabel className={cn("px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground", className)}>
            {children}
        </DropdownMenuLabel>
    );
};


const MenuGroup = ({ preview, children, className }: { preview: boolean; children: ReactNode; className?: string }) => {
    if (preview) {
        return (
            <div className={className}>
                {children}
            </div>
        );
    }

    return (
        <DropdownMenuGroup className={className}>
            {children}
        </DropdownMenuGroup>
    );
};


interface MenuEntryProps {
    preview: boolean;
    className?: string;
    children: ReactNode;
    renderLink: (children: ReactNode) => ReactElement;
}


const MenuEntry = ({ preview, children, className, renderLink }: MenuEntryProps) => {
    if (preview) {
        return (
            <div data-slot="dropdown-menu-item" className={cn(previewItemClassName, className)}>
                {children}
            </div>
        );
    }

    return (
        <DropdownMenuItem
            className={className}
            render={renderLink(children)}
        />
    );
};
