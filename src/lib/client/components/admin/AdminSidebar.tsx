import {useAuth} from "@/lib/client/hooks/use-auth";
import {Link, useRouterState} from "@tanstack/react-router";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@/lib/client/components/ui/sidebar";
import {
    Archive,
    Award,
    CalendarRange,
    CircleX,
    FolderKanban,
    History,
    Home,
    ImageOff,
    ListCheck,
    Play,
    Radio,
    RefreshCw,
    Settings,
    Upload,
    UserRoundX,
    Users
} from "lucide-react";


const navigation = [
    {
        title: "Overview", items: [
            { title: "Dashboard", to: "/admin/overview", icon: Home },
            { title: "Media activity", to: "/admin/media-overview", icon: Play },
            { title: "Lists activity", to: "/admin/collections-overview", icon: FolderKanban },
        ]
    },
    {
        title: "Users & community", items: [
            { title: "Users", to: "/admin/users", icon: Users },
            { title: "Inactive accounts", to: "/admin/inactive-accounts", icon: UserRoundX },
            { title: "Achievements", to: "/admin/achievements", icon: Award },
            { title: "Year recaps", to: "/admin/year-recaps", icon: CalendarRange },
        ]
    },
    {
        title: "Media catalog", items: [
            { title: "Missing covers", to: "/admin/missing-covers", icon: ImageOff },
            { title: "Update history", to: "/admin/history", icon: History },
            { title: "Metadata refreshes", to: "/admin/media-refresh", icon: RefreshCw },
        ]
    },
    {
        title: "Operations", items: [
            { title: "Tasks", to: "/admin/admin-tasks", icon: ListCheck },
            { title: "Task archive", to: "/admin/archived-tasks", icon: Archive },
            { title: "Imports", to: "/admin/imports", icon: Upload },
        ]
    },
    {
        title: "Monitoring", items: [
            { title: "API requests", to: "/admin/api-monitoring", icon: Radio },
            { title: "Application logs", to: "/admin/error-logs", icon: CircleX },
        ]
    },
] as const;


export function AdminSidebar() {
    const { currentUser } = useAuth();
    const pathname = useRouterState({ select: state => state.location.pathname });

    if (!currentUser) return null;

    return (
        <Sidebar>
            <SidebarHeader className="mt-16">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Settings className="size-4"/>
                    </div>
                    <div className="font-semibold">
                        Administration
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                {navigation.map(group =>
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map(item =>
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            isActive={pathname === item.to}
                                            render={
                                                <Link to={item.to}>
                                                    <item.icon/>
                                                    <span>
                                                        {item.title}
                                                    </span>
                                                </Link>
                                            }
                                        />
                                    </SidebarMenuItem>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
