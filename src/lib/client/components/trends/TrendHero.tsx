import {Eye, Flame} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {formatDate} from "@/lib/utils/date-formatting";
import {TrendsMedia} from "@/lib/types/provider.types";
import {Button} from "@/lib/client/components/ui/button";


export const TrendHero = ({ trend }: { trend: TrendsMedia }) => {
    if (!trend) return null;

    return (
        <div className="relative w-full h-75 md:h-100 rounded-2xl overflow-hidden mb-8 group border">
            <div className="absolute inset-0">
                <img
                    src={trend.posterPath}
                    alt={trend.displayName}
                    className="w-full h-full object-cover opacity-40 blur-sm scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/60 to-transparent"/>
                <div className="absolute inset-0 bg-linear-to-r from-neutral-950 via-neutral-950/40 to-transparent"/>
            </div>

            <div className="absolute bottom-0 left-0 p-6 md:p-10 max-w-2xl z-10">
                <div className="flex items-center gap-2 mb-2 text-app-accent font-bold text-xs uppercase tracking-widest">
                    <Flame className="size-4 fill-app-rating text-app-rating"/> #1 Trending
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-primary mb-3 drop-shadow-lg">
                    {trend.displayName}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
                    <span className="bg-popover px-2 py-0.5 rounded border">
                        {formatDate(trend.releaseDate)}
                    </span>
                    <span className="capitalize">
                        {trend.mediaType}
                    </span>
                </div>
                <p className="text-muted-foreground text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-6 max-w-lg">
                    {trend.overview}
                </p>
                <div className="flex items-center gap-3">
                    <Link
                        to="/details/$mediaType/external/$apiId"
                        params={{ mediaType: trend.mediaType, apiId: trend.apiId.toString() }}
                    >
                        <Button variant="emeraldy" size="lg">
                            <Eye className="size-4"/> See Details
                        </Button>
                    </Link>

                </div>
            </div>

            <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-2/3 rounded-lg shadow-2xl border
                hidden md:block transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <img
                    src={trend.posterPath}
                    alt={trend.displayName}
                    className="w-full h-full object-cover rounded-md"
                />
            </div>
        </div>
    );
};
