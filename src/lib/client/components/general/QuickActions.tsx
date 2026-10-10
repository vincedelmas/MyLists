import type {ReactNode} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Link, useLocation} from "@tanstack/react-router";
import {ActionsMenu} from "@/lib/client/components/general/ActionsMenu";
import {Award, CalendarDays, ChartNoAxesColumn, LibraryBig, Play, User, Zap} from "lucide-react";
import {DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator} from "@/lib/client/components/ui/dropdown-menu";


export const QuickActions = ({ username, mediaType, children }: { username: string; mediaType?: MediaType; children?: ReactNode }) => {
    const { currentUser } = useAuth();
    const { pathname } = useLocation();
    const isCurrent = currentUser?.name === username;

    const actions = [
        {
            params: { username },
            search: { mediaType },
            to: "/stats/$username",
            icon: ChartNoAxesColumn,
            match: `/stats/${username}`,
            label: isCurrent ? "My Stats" : "User's Stats",
        },
        ...(isCurrent ? [
            {
                icon: Play,
                label: "Continue",
                params: { username },
                to: "/lists/continue/$username",
                search: { activeTab: mediaType },
                match: `/lists/continue/${username}`,
            },
            {
                icon: CalendarDays,
                to: "/release-calendar",
                label: "Release Calendar",
                match: "/release-calendar",
            },
        ] : []),
        {
            icon: User,
            params: { username },
            to: "/profile/$username",
            match: `/profile/${username}`,
            label: isCurrent ? "My Profile" : "User's Profile",
        },
        {
            icon: Zap,
            params: { username },
            to: "/activity/$username",
            match: `/activity/${username}`,
            search: { activeTab: mediaType },
            label: isCurrent ? "My Activity" : "User's Activity",
        },
        {
            icon: LibraryBig,
            params: { username },
            to: "/lists/$username",
            match: `/lists/${username}`,
            label: "Lists & collections",
        },
        {
            icon: Award,
            params: { username },
            to: "/achievements/$username",
            match: `/achievements/${username}`,
            label: isCurrent ? "My Achievements" : "User's Achievements",
        },
    ];

    return (
        <ActionsMenu label="Quick actions">
            {children &&
                <>
                    {children}
                    <DropdownMenuSeparator/>
                </>
            }
            <DropdownMenuGroup>
                {actions
                    .filter((action) => pathname !== action.match)
                    .map((action) =>
                        <DropdownMenuItem
                            key={action.to}
                            render={
                                <Link
                                    to={action.to}
                                    params={"params" in action ? action.params : undefined}
                                    search={"search" in action ? action.search : undefined}
                                />
                            }
                        >
                            <action.icon/>
                            <span>{action.label}</span>
                        </DropdownMenuItem>
                    )}
            </DropdownMenuGroup>
        </ActionsMenu>
    );
};
