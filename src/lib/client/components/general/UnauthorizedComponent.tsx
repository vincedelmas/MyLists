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
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div
                    className="absolute inset-0 bg-size-[36px_36px]
                    bg-[linear-gradient(to_right,#e2e2e215_1px,transparent_1px),linear-gradient(to_bottom,#e2e2e215_1px,transparent_1px)]"
                />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center space-y-4">
                <div className="flex items-center justify-center size-16 rounded-full bg-popover border shadow-inner group">
                    <Lock className="size-7 text-primary/90"/>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight text-primary">
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
