import {ImageOff} from "lucide-react";
import type {MediaType} from "@/lib/utils/enums";
import {cn} from "@/lib/utils/classnames";


interface SmartListCoverStripProps {
    compact?: boolean;
    className?: string;
    covers: {
        title: string;
        mediaId: number;
        mediaType: MediaType;
        imageCover: string;
    }[];
}


export const SmartListCoverStrip = ({ covers, compact = false, className }: SmartListCoverStripProps) => {
    if (covers.length === 0) return null;

    return (
        <div aria-hidden="true" className={cn("flex shrink-0 gap-1.5", className)}>
            {covers.map(cover => (
                <div
                    title={cover.title}
                    key={`${cover.mediaType}-${cover.mediaId}`}
                    className={cn(
                        "flex aspect-2/3 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground",
                        compact ? "w-7 sm:w-8" : "w-10 sm:w-12",
                    )}
                >
                    {cover.imageCover
                        ? <img src={cover.imageCover} alt="" loading="lazy" className="size-full object-cover"/>
                        : <ImageOff className="size-4"/>
                    }
                </div>
            ))}
        </div>
    );
};
