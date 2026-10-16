import {ImageOff, Layers3} from "lucide-react";
import type {MediaType} from "@/lib/utils/enums";
import {cn} from "@/lib/utils/classnames";
import {toItemKey} from "@/lib/utils/media/item-key";


interface ListCoverStripProps {
    className?: string;
    covers: {
        mediaId: number;
        mediaType: MediaType;
        imageCover: string;
    }[];
}


export const ListCoverStrip = ({ covers, className }: ListCoverStripProps) => {
    const visibleCovers = covers.slice(0, 4);

    return (
        <div
            aria-hidden="true"
            className={cn("grid shrink-0 overflow-hidden bg-muted/20", className)}
            style={{ gridTemplateColumns: `repeat(${Math.max(visibleCovers.length, 1)}, minmax(0, 1fr))` }}
        >
            {visibleCovers.length === 0
                ? <div className="flex size-full items-center justify-center text-muted-foreground"><Layers3 className="size-8"/></div>
                : visibleCovers.map(cover =>
                    <div key={toItemKey(cover)} className="relative min-w-0 overflow-hidden bg-muted">
                        {cover.imageCover
                            ? <img src={cover.imageCover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover"/>
                            : <div className="flex size-full items-center justify-center text-muted-foreground"><ImageOff className="size-4"/></div>
                        }
                    </div>
                )
            }
        </div>
    );
};
