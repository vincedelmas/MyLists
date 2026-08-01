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
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent"/>
                <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent"/>
            </div>

            <div className="absolute bottom-0 left-0 p-6 md:p-10 max-w-2xl z-10">
                <div className="flex items-center gap-2 mb-2 text-brand font-bold text-xs uppercase tracking-widest">
                    <Flame className="size-4 fill-achievement text-achievement"/> #1 Trending
                </div>
                <h1 className="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-5xl">
                    {trend.displayName}
                </h1>
                <div className="mb-4 flex items-center gap-4 text-sm text-white/70">
                    <span className="rounded border border-white/15 bg-black/35 px-2 py-0.5 text-white">
                        {formatDate(trend.releaseDate)}
                    </span>
                    <span className="capitalize">
                        {trend.mediaType}
                    </span>
                </div>
                <p className="mb-6 max-w-lg line-clamp-2 text-sm text-white/70 md:line-clamp-3 md:text-base">
                    {trend.overview}
                </p>
                <div className="flex items-center gap-3">
                    <Link
                        to="/details/$mediaType/external/$apiId"
                        params={{ mediaType: trend.mediaType, apiId: trend.apiId.toString() }}
                    >
                        <Button size="lg">
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
