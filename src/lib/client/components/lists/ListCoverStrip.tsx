import {ImageOff, Layers3} from "lucide-react";
import type {MediaType} from "@/lib/utils/enums";
import {cn} from "@/lib/utils/classnames";
import {toItemKey} from "@/lib/utils/media/item-key";


interface ListCoverStripProps {
    compact?: boolean;
    variant?: "strip" | "showcase";
    className?: string;
    covers: {
        title: string;
        mediaId: number;
        mediaType: MediaType;
        imageCover: string;
    }[];
}


export const ListCoverStrip = ({ covers, compact = false, variant = "strip", className }: ListCoverStripProps) => {
    if (variant === "showcase") {
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
    }

    if (covers.length === 0) return null;

    return (
        <div aria-hidden="true" className={cn("flex shrink-0 gap-1.5", className)}>
            {covers.map(cover => (
                <div
                    title={cover.title}
                    key={toItemKey(cover)}
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
