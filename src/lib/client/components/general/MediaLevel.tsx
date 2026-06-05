import {Ban} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatLevel} from "@/lib/utils/number-formatting";


interface MediaLevelProps {
    className?: string;
    isActive?: boolean;
    mediaType: MediaType;
    timeSpentMin: number;
    containerClassName?: string;
}


export const MediaLevel = ({ timeSpentMin, mediaType, containerClassName, className, isActive = true }: MediaLevelProps) => {
    const intLevel = Math.floor(formatLevel(timeSpentMin));
    const color = isActive ? getThemeColor(mediaType) : "grey";

    return (
        <div className={cn("mx-auto flex items-center justify-center", containerClassName)}>
            <div className={cn("font-bold text-xl text", className)} style={{ color }}>
                {isActive ?
                    intLevel
                    :
                    <Ban className="size-4 mt-2 mb-1"/>
                }
            </div>
        </div>
    );
};
