import React from "react";
import {cn} from "@/lib/utils/classnames";
import {Button} from "@/lib/client/components/ui/button";
import {useLocation, useNavigate} from "@tanstack/react-router";
import {LinkSidebarItem} from "@/lib/client/components/general/LinkSidebar";
import {ChevronLeft, ChevronRight, Info, LucideIcon, X} from "lucide-react";


interface OnboardingSectionProps {
    title: string;
    icon: LucideIcon;
    children?: React.ReactNode;
    description: React.ReactNode;
}


export const OnboardingSection = ({ title, icon: Icon, description, children }: OnboardingSectionProps) => (
    <section className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg shrink-0 bg-app-accent/20 text-primary">
                <Icon className="size-6"/>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
                {title}
            </h2>
        </div>
        <div className="text-muted-foreground text-lg leading-relaxed">
            {description}
        </div>
        {children}
    </section>
);


interface OnboardingSubSectionProps {
    title: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
    description: React.ReactNode;
}


export const OnboardingSubSection = ({ title, description, icon: Icon, children }: OnboardingSubSectionProps) => (
    <section className="space-y-6">
        <div className="space-y-2">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                {Icon && <Icon className="size-5 text-app-accent"/>}
                {title}
            </h3>
            <div className="text-muted-foreground">
                {description}
            </div>
        </div>
        {children}
    </section>
);


export const OnboardingDemoBox = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div
        className={cn(
            "p-8 bg-accent/20 rounded-xl border border-dashed flex",
            "justify-center items-center relative group pointer-events-none",
            "select-none", className,
        )}
    >
        {children}
    </div>
);


interface OnboardingNoteProps {
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    variant?: "info" | "warning";
}


export const OnboardingNote = ({ title, children, icon: Icon = Info, variant = "info" }: OnboardingNoteProps) => (
    <section className="p-4 rounded-lg bg-card border flex gap-4">
        <div className="mt-1">
            <Icon
                className={cn("size-5", variant === "info" ? "text-app-accent" : "text-app-rating")}
            />
        </div>
        <div>
            <h4 className="font-bold">
                {title}
            </h4>
            <div className="text-sm text-muted-foreground">
                {children}
            </div>
        </div>
    </section>
);


export const OnboardingGrid = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {children}
        </div>
    );
}


interface OnboardingFeatureCardProps {
    title: string,
    icon: LucideIcon,
    description: string | React.ReactNode,
}


export const OnboardingFeatureCard = ({ icon: Icon, title, description }: OnboardingFeatureCardProps) => (
    <div className="p-5 rounded-xl border bg-card hover:border-app-accent/50 transition-colors">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg shrink-0 bg-app-accent/20 text-primary">
                <Icon className="size-5"/>
            </div>
            <h4 className="font-bold capitalize">
                {title}
            </h4>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
        </p>
    </div>
);


export const OnboardingContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={cn("space-y-10 max-w-3xl w-full", className)}>
            {children}
        </div>
    );
}


interface OnboardingNavProps {
    username: string;
    items: LinkSidebarItem[];
    position: "top" | "bottom";
}


export const OnboardingNav = ({ username, items, position }: OnboardingNavProps) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const steps = items.filter((item) => item.type !== "separator");
    const currentIndex = steps.findIndex((item) => pathname.includes(item.to!));

    const prevStep = steps[currentIndex - 1];
    const nextStep = steps[currentIndex + 1];

    const handleSkip = () => {
        void navigate({ to: "/profile/$username", params: { username } });
    };

    const handleNavigate = async (to?: string) => {
        if (to) await navigate({ to });
    };

    return (
        <div className={cn(position === "top"
            ? "flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 pb-5 border-b"
            : "flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-10 border-t"
        )}>
            <div className="flex items-center gap-3 order-2 sm:order-1">
                <Button size="sm" variant="outline" disabled={!prevStep} onClick={() => handleNavigate(prevStep?.to)}>
                    <ChevronLeft/> Prev
                </Button>

                {nextStep ?
                    <Button size="sm" variant="default" onClick={() => handleNavigate(nextStep?.to)}>
                        Next <ChevronRight/>
                    </Button>
                    :
                    <Button size="sm" variant="emeraldy" onClick={handleSkip}>
                        Finish Walkthrough
                    </Button>
                }
            </div>
            <Button
                size="sm"
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground order-1 sm:order-2"
            >
                <X className="size-4"/> Skip Walkthrough
            </Button>
        </div>
    );
};
