import {useState} from "react";
import {cva} from "class-variance-authority";
import authClient from "@/lib/utils/auth-client";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useQueryClient} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {useAuthModal} from "@/lib/client/hooks/use-auth-modal";
import {SearchBar} from "@/lib/client/components/navbar/SearchBar";
import {authOptions} from "@/lib/client/react-query/query-options";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {Link, useLocation, useNavigate} from "@tanstack/react-router";
import {MyMediaMenu} from "@/lib/client/components/navbar/MyMediaMenu";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {Notifications} from "@/lib/client/components/navbar/Notifications";
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
    BarChart2,
    ChevronDown,
    Clapperboard,
    GitCompareArrows,
    ListOrdered,
    LogOut,
    Menu,
    Settings,
    ShieldCheck,
    TrendingUp,
    Trophy,
    User,
    UsersRound,
    X,
} from "lucide-react";


const navStyle = cva("inline-flex items-center justify-center rounded-md px-4 text-sm " +
    "font-medium hover:text-brand outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none " +
    "disabled:opacity-50"
)


const mobileNavStyle = "flex flex-col items-center gap-1 rounded-md p-1 text-muted-foreground outline-none " +
    "hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50";


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
                                <span className="text-xl font-bold text-foreground block tracking-tight max-sm:hidden">
                                    MyLists
                                </span>
                            </div>
                        </Link>
                        :
                        <Link to="/profile/$username" params={{ username: currentUser.name }}>
                            <div className="flex shrink-0 items-center gap-2">
                                <img alt="MyLists logo" className="size-5" src="/logo192.png"/>
                                <span className="text-xl font-bold text-foreground block tracking-tight max-sm:hidden">
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
                            <DropdownMenuContent className="w-fit" align="end">
                                <DropdownMenuGroup>
                                    <DropdownMenuItem render={<Link to="/moviedle"/>}>
                                        <Clapperboard className="size-3.5"/> Moviedle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem render={<Link to="/which-came-first"/>}>
                                        <GitCompareArrows className="size-3.5"/> Which Came First?
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="mx-1"/>
                                    <DropdownMenuItem render={<Link to="/collections/discover"/>}>
                                        <ListOrdered className="size-3.5"/> Collections
                                    </DropdownMenuItem>
                                    <DropdownMenuItem render={<Link to="/hall-of-fame"/>}>
                                        <Trophy className="size-3.5"/> Hall of Fame
                                    </DropdownMenuItem>
                                    {!isAnonymous &&
                                        <DropdownMenuItem render={<Link to="/taste-matches"/>}>
                                            <UsersRound className="size-3.5"/> Taste Matches
                                        </DropdownMenuItem>
                                    }
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link to="/platform-stats" className={navStyle()} activeProps={{ className: "text-brand" }}>
                            Stats
                        </Link>

                        <Link to="/trends" className={navStyle()} activeProps={{ className: "text-brand" }}>
                            Trends
                        </Link>
                    </div>

                    <div className="flex items-center gap-1 max-sm:gap-2">
                        {isAnonymous ?
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" onClick={() => openLogin(location.href)}>
                                    Login
                                </Button>
                                <Button onClick={() => openRegister(location.href)}>
                                    Register
                                </Button>
                            </div>
                            :
                            <>
                                <MyMediaMenu
                                    username={currentUser.name}
                                    triggerClassName={navStyle()}
                                    settings={currentUser.settings}
                                />

                                <Notifications/>

                                <DropdownMenu>
                                    <div className="relative">
                                        <DropdownMenuTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    className="flex items-center gap-2 text-lg font-semibold px-1"
                                                />
                                            }
                                        >
                                            <ProfileIcon
                                                fallbackSize="text-base"
                                                user={{ name: currentUser.name, image: currentUser.image! }}
                                                className="size-10 border-none hover:ring-2 hover:ring-brand"
                                            />
                                        </DropdownMenuTrigger>
                                        {currentUser.showUpdateModal &&
                                            <div className="absolute right-0 top-0">
                                                <div className="relative">
                                                    <div className="absolute rounded-full h-2 w-2 bg-brand opacity-75"/>
                                                    <div className="rounded-full h-2 w-2 bg-linear-to-r from-brand to-brand/50 animate-ping"/>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {currentUser.name}
                                                    </p>
                                                    <p title={`${capitalize(currentUser.privacy)} account`}>
                                                        <PrivacyIcon type={currentUser.privacy}/>
                                                    </p>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {currentUser.email}
                                                </p>
                                            </DropdownMenuLabel>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem render={<Link to="/profile/$username" params={{ username: currentUser.name }}/>}>
                                                <User/> Profile
                                            </DropdownMenuItem>
                                            {currentUser.capabilities.enterAdminDashboard &&
                                                <DropdownMenuItem className="hover:text-warning" render={<Link to="/admin"/>}>
                                                    <ShieldCheck className="text-warning"/>
                                                    <span className="text-warning">
                                                        Admin Panel
                                                    </span>
                                                </DropdownMenuItem>
                                            }
                                            <DropdownMenuItem render={<Link to="/features" onClick={onFeaturesClick}/>}>
                                                <div className="flex w-full items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="text-brand"/>
                                                        <span>News & Features</span>
                                                    </div>
                                                    {currentUser.showUpdateModal &&
                                                        <Badge className="animate-pulse text-[10px] font-bold text-primary-foreground">
                                                            NEW
                                                        </Badge>
                                                    }
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem render={<Link to="/settings"/>}>
                                                <Settings/> Settings
                                            </DropdownMenuItem>
                                            <DropdownMenuItem variant="destructive" onClick={logoutUser}>
                                                <LogOut/> Logout
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        }

                        <button
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="rounded-md p-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3
                            focus-visible:ring-ring/50 lg:hidden"
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
                            <div className="flex flex-wrap justify-around items-center gap-x-4 gap-y-4 px-2">
                                <Link className={mobileNavStyle} to="/moviedle" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Clapperboard className="size-4"/>
                                    <span className="text-[10px]">Moviedle</span>
                                </Link>
                                <Link
                                    to="/which-came-first"
                                    className={mobileNavStyle}
                                    aria-label="Which Came First?"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <GitCompareArrows className="size-4"/>
                                    <span className="text-[10px]">WCF?</span>
                                </Link>
                                <Link className={mobileNavStyle} to="/collections/discover" onClick={() => setIsMobileMenuOpen(false)}>
                                    <ListOrdered className="size-4"/>
                                    <span className="text-[10px]">Collections</span>
                                </Link>
                                <Link
                                    to="/hall-of-fame"
                                    aria-label="Hall of Fame"
                                    className={mobileNavStyle}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Trophy className="size-4"/>
                                    <span className="text-[10px]">HoF</span>
                                </Link>
                                <Link className={mobileNavStyle} to="/platform-stats" onClick={() => setIsMobileMenuOpen(false)}>
                                    <BarChart2 className="size-4"/>
                                    <span className="text-[10px]">Stats</span>
                                </Link>
                                <Link className={mobileNavStyle} to="/trends" onClick={() => setIsMobileMenuOpen(false)}>
                                    <TrendingUp className="size-4"/>
                                    <span className="text-[10px]">Trends</span>
                                </Link>
                                {!isAnonymous &&
                                    <Link className={mobileNavStyle} to="/taste-matches" onClick={() => setIsMobileMenuOpen(false)}>
                                        <UsersRound className="size-4"/>
                                        <span className="text-[10px]">Matches</span>
                                    </Link>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>
        </nav>
    );
};
