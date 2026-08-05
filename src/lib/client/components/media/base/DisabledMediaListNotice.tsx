import {Settings} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Card} from "@/lib/client/components/ui/card";
import {capitalize} from "@/lib/utils/text-formatting";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


interface DisabledMediaListNoticeProps {
    compact?: boolean;
    mediaType: MediaType;
}


export const DisabledMediaListNotice = ({ mediaType, compact = false }: DisabledMediaListNoticeProps) => {
    const content = (
        <>
            <div className={cn("space-y-3 text-center", !compact && "space-y-3")}>
                <h3 className={cn("font-semibold flex gap-2 items-center justify-center", compact ? "text-sm" : "text-lg")}>
                    <MainThemeIcon type={mediaType} size={compact ? 18 : 22}/>
                    {capitalize(mediaType)} List Disabled
                </h3>
                <p className="text-xs text-muted-foreground">
                    Your {mediaType} list is disabled. To track this media, enable it in your settings.
                </p>
                <Link
                    to="/settings/content-lists"
                    className={buttonVariants({ size: "sm", className: cn(!compact && "w-full") })}
                >
                    <Settings/> Enable in settings
                </Link>
            </div>
        </>
    );

    if (compact) return content;
    return <Card>{content}</Card>;
};
