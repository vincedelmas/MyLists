import React from "react";
import {Lock} from "lucide-react";
import {Card} from "@/lib/client/components/ui/card";


interface UnauthorizedComponentProps {
    type: "restricted" | "private" | "sign-in";
}


export const UnauthorizedComponent = ({ type }: UnauthorizedComponentProps) => {
    const title = type === "restricted"
        ? "This content is restricted"
        : "This content is private";

    const description = type === "restricted"
        ? "Sign-in to see this user's contents: lists, stats, and updates."
        : "Follow this user to see their contents: lists, stats, and updates.";

    return (
        <Card className="w-full max-w-sm mx-auto bg-popover relative overflow-hidden shadow-2xl">
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-50 bg-size-[32px_32px]"
                style={{
                    backgroundImage: `linear-gradient(to right, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px),
                    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px)`,
                }}
            />
            <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center space-y-4">
                <div className="flex items-center justify-center size-16 rounded-full bg-popover border shadow-inner group">
                    <Lock className="size-7 text-foreground/90"/>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-70 mx-auto leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </Card>
    );
};
