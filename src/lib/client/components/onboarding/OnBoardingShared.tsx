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
    <section className="space-y-3">
        <div className="flex items-start gap-3">
            <Icon className="mt-1 size-5 shrink-0 text-brand" aria-hidden="true"/>
            <div>
                <div className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    In this step
                </div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {title}
                </h2>
            </div>
        </div>
        <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:pl-8">
            {description}
        </div>
        {children && <div className="pt-2 sm:pl-8">{children}</div>}
    </section>
);


interface OnboardingSubSectionProps {
    title: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
    description: React.ReactNode;
}


export const OnboardingSubSection = ({ title, description, icon: Icon, children }: OnboardingSubSectionProps) => (
    <section className="space-y-5">
        <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                {Icon && <Icon className="size-4 text-brand"/>}
                {title}
            </h3>
            <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
            </div>
        </div>
        {children}
    </section>
);


export const OnboardingDemoBox = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div
        className={cn(
            "group relative flex items-center justify-center overflow-x-auto rounded-xl bg-muted/20 p-8",
            "select-none [&>*]:pointer-events-none max-sm:justify-start max-sm:px-3 max-sm:py-6",
            className,
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
    <aside className={cn(
        "flex gap-3 rounded-xl border-l-2 px-4 py-3",
        variant === "info" ? "border-brand bg-brand/5" : "border-warning bg-warning/5",
    )}>
        <div className="mt-0.5">
            <Icon
                className={cn("size-4", variant === "info" ? "text-brand" : "text-warning")}
            />
        </div>
        <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {title}
            </h4>
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {children}
            </div>
        </div>
    </aside>
);


export const OnboardingGrid = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="grid gap-x-6 gap-y-8 md:grid-cols-2">
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
    <article className="border-l border-brand/40 py-1 pl-4">
        <div className="flex items-center gap-2.5">
            <Icon className="size-4 shrink-0 text-brand" aria-hidden="true"/>
            <h4 className="font-semibold capitalize text-foreground">
                {title}
            </h4>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
        </div>
    </article>
);


export const OnboardingContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={cn("w-full max-w-4xl space-y-12", className)}>
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
        <nav
            aria-label={`${position === "top" ? "Top" : "Bottom"} walkthrough navigation`}
            className={cn(
                "flex items-center justify-between gap-4",
                position === "top" ? "mb-8" : "mt-10 pt-2",
            )}
        >
            <Button size="sm" variant="hover" disabled={!prevStep} onClick={() => handleNavigate(prevStep?.to)}>
                <ChevronLeft/> Previous
            </Button>

            <div className="flex items-center gap-2">
                {position === "top" &&
                    <Button size="sm" variant="hover" onClick={handleSkip} className="text-muted-foreground">
                        <X className="size-4"/> <span className="max-sm:sr-only">Exit guide</span>
                    </Button>
                }
                {nextStep ?
                    <Button size="sm" onClick={() => handleNavigate(nextStep?.to)}>
                        Next <span className="max-sm:hidden">- {nextStep.label}</span> <ChevronRight/>
                    </Button>
                    :
                    <Button size="sm" onClick={handleSkip}>
                        Finish walkthrough
                    </Button>
                }
            </div>
        </nav>
    );
};
