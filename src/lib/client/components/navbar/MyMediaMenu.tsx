import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import type {ReactElement, ReactNode} from "react";
import {capitalize} from "@/lib/utils/text-formatting";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Award, Calendar, ChartNoAxesColumn, ChevronDown, ListOrdered, Zap} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


const defaultTriggerClassName = "inline-flex items-center justify-center px-4 text-sm font-medium hover:text-app-accent";

const previewItemClassName = "[&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 " +
    "rounded-sm px-2 py-1.5 text-sm select-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";


interface MyMediaMenuProps {
    username: string;
    preview?: boolean;
    triggerClassName?: string;
    highlightComingNext?: boolean;
    settings: { active: boolean; mediaType: MediaType }[];
}


export const MyMediaMenu = ({ username, settings, preview = false, triggerClassName, highlightComingNext = false }: MyMediaMenuProps) => {
    const currentDate = useCurrentDate();
    const [currentYear, currentMonth] = currentDate?.split("-") ?? [];

    const content = (
        <MyMediaMenuContent
            preview={preview}
            username={username}
            settings={settings}
            currentYear={currentYear}
            currentMonth={currentMonth}
            highlightComingNext={highlightComingNext}
        />
    );

    if (preview) {
        return (
            <div className="flex max-w-full flex-col items-center gap-4">
                <div className={cn(defaultTriggerClassName, triggerClassName)}>
                    MyMedia <ChevronDown className="ml-2 size-3 opacity-70"/>
                </div>
                <div className="w-92 max-w-full overflow-hidden rounded-md border bg-background text-primary shadow-md">
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
            <DropdownMenuContent className="w-92 p-0" align="end">
                {content}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


interface MyMediaMenuContentProps extends Pick<MyMediaMenuProps, "username" | "settings" | "highlightComingNext"> {
    preview: boolean;
    currentYear?: string;
    currentMonth?: string;
}


const MyMediaMenuContent = ({ preview, username, settings, currentYear, currentMonth, highlightComingNext, }: MyMediaMenuContentProps) => {
    return (
        <div className="grid grid-cols-2">
            <div className="bg-muted/30 px-3 pt-1 pb-2">
                <MenuLabel preview={preview}>
                    Tracking Lists
                </MenuLabel>
                <MenuGroup preview={preview}>
                    {settings
                        .filter((setting) => setting.active)
                        .map((setting) =>
                            <MenuEntry
                                preview={preview}
                                key={setting.mediaType}
                                renderLink={(children) =>
                                    <Link
                                        to="/list/$mediaType/$username"
                                        params={{ mediaType: setting.mediaType, username }}
                                    >
                                        {children}
                                    </Link>
                                }
                            >
                                <MainThemeIcon type={setting.mediaType}/>
                                {capitalize(setting.mediaType)} List
                            </MenuEntry>
                        )}
                </MenuGroup>
            </div>
            <div className="border-l px-3 pt-1 pb-2">
                <MenuLabel preview={preview}>
                    Personal
                </MenuLabel>
                <MenuGroup preview={preview}>
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
                                    to="/activity/$username"
                                    params={{ username }}
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
                        className={highlightComingNext
                            ? "bg-app-accent/20 font-bold text-app-accent ring-1 ring-app-accent/30 [&_svg]:text-app-accent!"
                            : undefined}
                        renderLink={(children) => <Link to="/coming-next">{children}</Link>}
                    >
                        <Calendar className="size-4"/> Coming Next
                    </MenuEntry>
                    <MenuEntry
                        preview={preview}
                        renderLink={(children) =>
                            <Link to="/collections/user/$username" params={{ username }}>
                                {children}
                            </Link>
                        }
                    >
                        <ListOrdered className="size-4"/> My Collections
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


const MenuLabel = ({ preview, children }: { preview: boolean; children: ReactNode }) => {
    if (preview) {
        return (
            <div className="mb-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {children}
            </div>
        );
    }

    return (
        <DropdownMenuLabel className="mb-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {children}
        </DropdownMenuLabel>
    );
};


const MenuGroup = ({ preview, children }: { preview: boolean; children: ReactNode }) => {
    if (preview) return <div>{children}</div>;
    return <DropdownMenuGroup>{children}</DropdownMenuGroup>;
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
            <div className={cn(previewItemClassName, className)}>
                {children}
            </div>
        );
    }

    return (
        <DropdownMenuItem className={className} asChild>
            {renderLink(children)}
        </DropdownMenuItem>
    );
};
