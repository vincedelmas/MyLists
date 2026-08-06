import {Link} from "@tanstack/react-router";
import {Activity, ChartNoAxesColumn, ChevronDown, Compass, LibraryBig} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Button} from "@/lib/client/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/lib/client/components/ui/dropdown-menu";


interface ProfileQuickLinksMenuProps {
    username: string;
    className?: string;
}


// Preserved labeled-menu version for easy comparison and restoration.
export const ProfileQuickLinksMenu = ({ username, className }: ProfileQuickLinksMenuProps) => {
    return (
        <div className={cn("inline-flex", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="sm"/>}>
                    <Compass aria-hidden="true" data-icon="inline-start"/>
                    Browse profile
                    <ChevronDown
                        aria-hidden="true"
                        data-icon="inline-end"
                        className="transition-transform duration-200 group-aria-expanded/button:rotate-180"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            render={
                                <Link
                                    to="/stats/$username"
                                    params={{ username }}
                                />
                            }
                        >
                            <ChartNoAxesColumn aria-hidden="true"/>
                            Stats
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            render={
                                <Link
                                    to="/activity/$username"
                                    params={{ username }}
                                    search={{ year: undefined, month: undefined }}
                                />
                            }
                        >
                            <Activity aria-hidden="true"/>
                            Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            render={
                                <Link
                                    to="/collections/user/$username"
                                    params={{ username }}
                                />
                            }
                        >
                            <LibraryBig aria-hidden="true"/>
                            Collections
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
