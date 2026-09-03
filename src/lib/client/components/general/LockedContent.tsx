import {LockIcon} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link, useLocation} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";


interface LockedContentProps {
    title: string;
    className?: string;
    description: string;
    isAnonymous: boolean;
    showAuthButtons?: boolean;
    variant?: "overlay" | "inline";
}


export const LockedContent = ({ isAnonymous, title, description, showAuthButtons, className, variant = "overlay" }: LockedContentProps) => {
    const location = useLocation();
    const isOverlay = (variant === "overlay");

    if (!isAnonymous) return null;

    return (
        <div className={cn("flex flex-col items-center justify-center text-center",
            isOverlay ? "absolute inset-0 bg-background/30 backdrop-blur-[2px] z-10 p-4" : "w-full", className
        )}>
            <div className={cn("bg-popover p-4 px-6 rounded-xl border shadow-lg space-y-3 w-full", isOverlay ? "max-w-xs" : "w-full")}>
                <LockIcon className="size-6 mx-auto text-foreground"/>
                <h4 className="font-semibold text-sm">
                    {title}
                </h4>
                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
                {showAuthButtons &&
                    <div className="flex justify-center items-center gap-2 mt-4">
                        <Link
                            to="/login"
                            search={{ redirect: location.href }}
                            className={cn(buttonVariants({ variant: "outline" }))}
                        >
                            Login
                        </Link>
                        <Link
                            to="/register"
                            className={buttonVariants()}
                            search={{ redirect: location.href }}
                        >
                            Register
                        </Link>
                    </div>
                }
            </div>
        </div>
    );
};
