import {cn} from "@/lib/utils/classnames";
import {Globe, Lock, Shield} from "lucide-react";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {getThemeColor, THEME_ICONS_MAP} from "@/lib/utils/theme-utils";


interface MainThemeIconProps {
    size?: number;
    className?: string;
    type: MediaType | "overview" | "all";
}


export const MainThemeIcon = ({ type, size, className }: MainThemeIconProps) => {
    const IconComp = THEME_ICONS_MAP[type];
    if (!IconComp) return null;

    return (
        <IconComp
            size={size ?? 18}
            className={className}
            style={{ color: getThemeColor(type) }}
        />
    );
};


export const PrivacyIcon = ({ type, className }: { type: PrivacyType, className?: string }) => {
    switch (type) {
        case PrivacyType.PUBLIC:
            return <Globe className={cn("size-3 text-emerald-400", className)}/>;
        case PrivacyType.PRIVATE:
            return <Lock className={cn("size-3 text-destructive", className)}/>;
        case PrivacyType.RESTRICTED:
        default:
            return <Shield className={cn("size-3 text-amber-400", className)}/>;
    }
};
