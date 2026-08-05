import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


interface MediaTypeProps {
    size?: number;
    className?: string;
    mediaType: MediaType;
}


export const MediaTypeIcon = ({ mediaType, className, size = 14 }: MediaTypeProps) => {
    const label = capitalize(mediaType);

    return (
        <span title={label} className={cn("inline-flex shrink-0 items-center justify-center", className)}>
            <MainThemeIcon type={mediaType} size={size}/>
            <span className="sr-only">
                {label}
            </span>
        </span>
    );
};


export const MediaTypeText = ({ mediaType, className }: MediaTypeProps) => {
    return (
        <span className={cn("capitalize", className)}>
            {mediaType}
        </span>
    );
};
