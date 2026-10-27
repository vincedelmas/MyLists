import {useAuth} from "@/lib/client/hooks/use-auth";
import {LibraryBig, Play, Search, User} from "lucide-react";
import {MobileSearch} from "@/lib/client/components/navbar/MobileSearch";
import {Link, useLocation, useNavigate, useRouter} from "@tanstack/react-router";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/lib/client/components/ui/sheet";


const shortcutStyle = "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs " +
    "font-medium text-muted-foreground hover:text-brand outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:size-6";


export const MobileNavigation = () => {
    const router = useRouter();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const searchOpen = location.state.mobileSearchOpen === true;

    const onOpenSheetChange = (open: boolean) => {
        if (open) {
            void navigate({
                href: location.href,
                resetScroll: false,
                state: (state) => ({ ...state, mobileSearchOpen: true }),
            });
        }
        else {
            router.history.back();
        }
    }

    return (
        <>
            <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden"/>
            <nav
                aria-label="Mobile shortcuts"
                className="fixed inset-x-0 bottom-0 z-50 flex border-t bg-background px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
            >
                <Link
                    className={shortcutStyle}
                    activeProps={{ className: "text-brand" }}
                    params={{ username: currentUser?.name ?? "" }}
                    to={currentUser ? "/profile/$username" : "/login"}
                >
                    <User/>
                    <span>Profile</span>
                </Link>
                <Link
                    className={shortcutStyle}
                    activeProps={{ className: "text-brand" }}
                    params={{ username: currentUser?.name ?? "" }}
                    to={currentUser ? "/lists/$username" : "/login"}
                >
                    <LibraryBig/>
                    <span>My lists</span>
                </Link>
                <Link
                    className={shortcutStyle}
                    activeProps={{ className: "text-brand" }}
                    params={{ username: currentUser?.name ?? "" }}
                    to={currentUser ? "/lists/continue/$username" : "/login"}
                >
                    <Play/>
                    <span>Continue</span>
                </Link>
                <Sheet open={searchOpen} onOpenChange={onOpenSheetChange}>
                    <SheetTrigger className={shortcutStyle}>
                        <Search/>
                        <span>Search</span>
                    </SheetTrigger>
                    <SheetContent
                        side="bottom"
                        showCloseButton={false}
                        finalFocus={(closeType) => closeType === "keyboard"}
                        className="max-h-dvh gap-0 rounded-none pb-[env(safe-area-inset-bottom)] data-[side=bottom]:h-dvh"
                    >
                        <SheetHeader className="sr-only">
                            <SheetTitle>
                                Search
                            </SheetTitle>
                        </SheetHeader>
                        <MobileSearch/>
                    </SheetContent>
                </Sheet>
            </nav>
        </>
    );
};
