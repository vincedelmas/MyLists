import {useState} from "react";
import {cva} from "class-variance-authority";
import authClient from "@/lib/utils/auth-client";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useQueryClient} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {isAtLeastRole, RoleType} from "@/lib/utils/enums";
import {useAuthModal} from "@/lib/client/hooks/use-auth-modal";
import {SearchBar} from "@/lib/client/components/navbar/SearchBar";
import {authOptions} from "@/lib/client/react-query/query-options";
import {Link, useLocation, useNavigate} from "@tanstack/react-router";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {Notifications} from "@/lib/client/components/navbar/Notifications";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {useFeatureFlagMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/lib/client/components/ui/dropdown-menu";
import {
    Activity,
    Award,
    BarChart2,
    Calendar,
    ChartNoAxesColumn,
    ChevronDown,
    Clapperboard,
    ListOrdered,
    LogOut,
    Menu,
    Settings,
    ShieldCheck,
    TrendingUp,
    Trophy,
    User,
    X,
    Zap
} from "lucide-react";


const navStyle = cva("inline-flex items-center justify-center px-4 text-sm font-medium hover:text-app-accent " +
    "disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
)


export const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { currentUser, isAnonymous } = useAuth();
    const { openLogin, openRegister } = useAuthModal();
    const featureFlagMutation = useFeatureFlagMutation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const logoutUser = async () => {
        await authClient.signOut();
        queryClient.setQueryData(authOptions.queryKey, null);
        await navigate({ to: "/", replace: true });
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authOptions.queryKey[0] });
    };

    const onFeaturesClick = async () => {
        if (!currentUser?.showUpdateModal) return;
        featureFlagMutation.mutate(undefined);
    }

    return (
        <nav className="sticky top-0 z-50 w-full bg-background border-b">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between h-16 gap-4">
                    {isAnonymous ?
                        <Link to="/">
                            <div className="flex shrink-0 items-center gap-2">
                                <img alt="MyLists logo" className="size-5" src="/logo192.png"/>
                                <span className="text-xl font-bold text-primary block tracking-tight max-sm:hidden">
                                    MyLists
                                </span>
                            </div>
                        </Link>
                        :
                        <Link to="/profile/$username" params={{ username: currentUser.name }}>
                            <div className="flex shrink-0 items-center gap-2">
                                <img alt="MyLists logo" className="size-5" src="/logo192.png"/>
                                <span className="text-xl font-bold text-primary block tracking-tight max-sm:hidden">
                                    MyLists
                                </span>
                            </div>
                        </Link>
                    }

                    <div className="flex-1 max-w-md z-50 block max-lg:hidden">
                        <SearchBar/>
                    </div>

                    <div className="flex items-center gap-1 max-lg:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger className={navStyle()}>
                                Community
                                <ChevronDown className="ml-2 size-3 opacity-70"/>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-36" align="end">
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link to="/moviedle">
                                            <Clapperboard className="size-3.5"/> Moviedle
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/collections/discover">
                                            <ListOrdered className="size-3.5"/> Collections
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/hall-of-fame">
                                            <Trophy className="size-3.5"/> Hall of Fame
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link to="/platform-stats" className={navStyle()} activeProps={{ className: "text-app-accent" }}>
                            Stats
                        </Link>

                        <Link to="/trends" className={navStyle()} activeProps={{ className: "text-app-accent" }}>
                            Trends
                        </Link>
                    </div>

                    <div className="flex items-center gap-1 max-sm:gap-2">
                        {isAnonymous ?
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openLogin(location.href)}>
                                    Login
                                </Button>
                                <Button size="sm" variant="emeraldy" onClick={() => openRegister(location.href)}>
                                    Register
                                </Button>
                            </div>
                            :
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className={navStyle()}>
                                        MyMedia
                                        <ChevronDown className="ml-2 size-3 opacity-70"/>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-92 p-0" align="end">
                                        <div className="grid grid-cols-2">
                                            <div className="bg-muted/30 pt-1 pb-2 px-3">
                                                <DropdownMenuLabel className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    Tracking Lists
                                                </DropdownMenuLabel>
                                                <DropdownMenuGroup>
                                                    {currentUser.settings
                                                        .filter((s) => s.active)
                                                        .map((setting) =>
                                                            <DropdownMenuItem key={setting.mediaType} asChild>
                                                                <Link
                                                                    to="/list/$mediaType/$username"
                                                                    params={{ mediaType: setting.mediaType, username: currentUser.name }}
                                                                >
                                                                    <MainThemeIcon type={setting.mediaType}/>
                                                                    {capitalize(setting.mediaType)} List
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                </DropdownMenuGroup>
                                            </div>
                                            <div className="border-l pt-1 pb-2 px-3">
                                                <DropdownMenuLabel className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    Personal
                                                </DropdownMenuLabel>
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem asChild>
                                                        <Link to="/stats/$username" params={{ username: currentUser.name }}>
                                                            <ChartNoAxesColumn className="size-4"/> My Stats
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            to="/activity/$username"
                                                            params={{ username: currentUser.name }}
                                                            search={{ year: String(new Date().getFullYear()), month: String(new Date().getMonth() + 1) }}
                                                        >
                                                            <Zap className="size-4"/> My Activity
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link to="/coming-next">
                                                            <Calendar className="size-4"/> Coming Next
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link to="/collections/user/$username" params={{ username: currentUser.name }}>
                                                            <ListOrdered className="size-4"/> My Collections
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link to="/achievements/$username" params={{ username: currentUser.name }}>
                                                            <Award className="size-4"/> My Achievements
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                            </div>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Notifications/>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="relative">
                                            <Button variant="invisible" className="flex items-center gap-2 text-lg font-semibold px-1">
                                                <ProfileIcon
                                                    fallbackSize="text-base"
                                                    user={{ name: currentUser.name, image: currentUser.image! }}
                                                    className="size-10 border-none hover:ring-2 hover:ring-app-accent"
                                                />
                                            </Button>
                                            {currentUser.showUpdateModal &&
                                                <div className="absolute right-0 top-0">
                                                    <div className="relative">
                                                        <div className="absolute rounded-full h-2 w-2 bg-app-accent opacity-75"/>
                                                        <div className="rounded-full h-2 w-2 bg-linear-to-r from-app-accent to-app-accent/50 animate-ping"/>
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuItem className="block focus:bg-transparent cursor-default">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium text-primary">
                                                    {currentUser.name}
                                                </p>
                                                <p className="text-sm font-medium text-primary" title={`${capitalize(currentUser.privacy)} account`}>
                                                    <PrivacyIcon type={currentUser.privacy}/>
                                                </p>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {currentUser.email}
                                            </p>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem asChild>
                                                <Link to="/profile/$username" params={{ username: currentUser.name }}>
                                                    <User/>
                                                    Profile
                                                </Link>
                                            </DropdownMenuItem>
                                            {isAtLeastRole(currentUser.role, RoleType.ADMIN) &&
                                                <DropdownMenuItem className="focus:bg-app-rating/10" asChild>
                                                    <Link to="/admin">
                                                        <ShieldCheck className="text-app-rating"/>
                                                        <span className="text-app-rating">
                                                            Admin Panel
                                                        </span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            }
                                            <DropdownMenuItem asChild>
                                                <Link to="/features" className="relative w-full" onClick={onFeaturesClick}>
                                                    <div className="flex w-full items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Activity className="size-4 text-app-accent"/>
                                                            <span>News & Features</span>
                                                        </div>
                                                        {currentUser.showUpdateModal &&
                                                            <div className="bg-app-accent px-2 py-0.5 text-[10px] font-bold
                                                            text-black rounded-md animate-pulse">
                                                                NEW
                                                            </div>
                                                        }
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem asChild>
                                                <Link to="/settings">
                                                    <Settings/>
                                                    Settings
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="focus:bg-red-500/10" onSelect={logoutUser}>
                                                <LogOut className="text-red-500"/>
                                                <span className="text-red-500">Logout</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        }

                        <button
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-muted-foreground hover:text-primary"
                        >
                            {isMobileMenuOpen ? <X className="size-6"/> : <Menu className="size-6"/>}
                        </button>
                    </div>
                </div>

                {isMobileMenuOpen &&
                    <div className="lg:hidden absolute left-0 right-0 z-50 border-b bg-background p-4 animate-in slide-in-from-top-5">
                        <div className="relative mb-4 flex-1 mx-auto max-w-md z-50 block">
                            <SearchBar setMobileMenu={setIsMobileMenuOpen}/>
                        </div>

                        <div className="p-2 max-h-[70vh] overflow-y-auto scrollbar-thin mt-3">
                            <div className="flex flex-wrap justify-around items-center gap-2 px-2">
                                <Link to="/moviedle" onClick={() => setIsMobileMenuOpen(false)}>
                                    <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-app-accent">
                                        <Clapperboard className="size-4"/>
                                        <span className="text-[10px]">Moviedle</span>
                                    </button>
                                </Link>
                                <Link to="/collections/discover" onClick={() => setIsMobileMenuOpen(false)}>
                                    <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-app-accent">
                                        <ListOrdered className="size-4"/>
                                        <span className="text-[10px]">Collections</span>
                                    </button>
                                </Link>
                                <Link to="/hall-of-fame" onClick={() => setIsMobileMenuOpen(false)}>
                                    <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-app-accent">
                                        <Trophy className="size-4"/>
                                        <span className="text-[10px]">HoF</span>
                                    </button>
                                </Link>
                                <Link to="/platform-stats" onClick={() => setIsMobileMenuOpen(false)}>
                                    <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-app-accent">
                                        <BarChart2 className="size-4"/>
                                        <span className="text-[10px]">Stats</span>
                                    </button>
                                </Link>
                                <Link to="/trends" onClick={() => setIsMobileMenuOpen(false)}>
                                    <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-app-accent">
                                        <TrendingUp className="size-4"/>
                                        <span className="text-[10px]">Trends</span>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </nav>
    );
};
