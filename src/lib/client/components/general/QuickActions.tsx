import {MediaType} from "@/lib/utils/enums";
import {Link, useLocation} from "@tanstack/react-router";
import {Award, ChartNoAxesColumn, EllipsisVertical, ListOrdered, User, Zap} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


export const QuickActions = ({ username, mediaType }: { username: string, mediaType?: MediaType }) => {
    const { pathname } = useLocation();

    const actions = [
        {
            params: { username },
            search: { mediaType },
            label: "User's Stats",
            to: "/stats/$username",
            icon: ChartNoAxesColumn,
            match: `/stats/${username}`,
        },
        {
            icon: User,
            params: { username },
            label: "User's Profile",
            to: "/profile/$username",
            match: `/profile/${username}`,
        },
        {
            icon: Zap,
            params: { username },
            label: "User's Activity",
            to: "/activity/$username",
            match: `/activity/${username}`,
            search: { activeTab: mediaType },
        },
        {
            icon: ListOrdered,
            params: { username },
            label: "User's Collections",
            to: "/collections/user/$username",
            match: `/collections/user/${username}`,
        },
        {
            icon: Award,
            params: { username },
            label: "User's Achievements",
            to: "/achievements/$username",
            match: `/achievements/${username}`,
        },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="opacity-70 hover:opacity-100">
                <EllipsisVertical className="size-4"/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-46">
                {actions
                    .filter((action) => pathname !== action.match)
                    .map((action) =>
                        <Link
                            to={action.to}
                            key={action.to}
                            params={action.params}
                            search={"search" in action ? action.search : undefined}
                        >
                            <DropdownMenuItem className="cursor-pointer">
                                <action.icon className="size-4 text-muted-foreground"/>
                                <span>{action.label}</span>
                            </DropdownMenuItem>
                        </Link>
                    )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
