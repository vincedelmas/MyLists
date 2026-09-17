import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Button} from "@/lib/client/components/ui/button";
import {Link, useLocation} from "@tanstack/react-router";
import {Award, CalendarDays, ChartNoAxesColumn, EllipsisVertical, ListOrdered, Play, User, Zap} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


export const QuickActions = ({ username, mediaType }: { username: string, mediaType?: MediaType }) => {
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
                to: "/continue",
                label: "Continue",
                match: "/continue",
                search: { activeTab: mediaType },
            },
            {
                to: "/coming-next",
                icon: CalendarDays,
                label: "Coming Next",
                match: "/coming-next",
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
            icon: ListOrdered,
            params: { username },
            to: "/collections/user/$username",
            match: `/collections/user/${username}`,
            label: isCurrent ? "My Collections" : "User's Collections",
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
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon" variant="hover" aria-label="Quick actions"/>}>
                <EllipsisVertical/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-50">
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
