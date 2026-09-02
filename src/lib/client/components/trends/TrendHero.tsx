import {Eye, Flame} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {formatDate} from "@/lib/utils/date-formatting";
import {TrendsMedia} from "@/lib/types/provider.types";
import {Button} from "@/lib/client/components/ui/button";


export const TrendHero = ({ trend }: { trend: TrendsMedia }) => {
    if (!trend) return null;

    return (
        <div className="group relative mt-6 h-75 w-full overflow-hidden rounded-2xl border md:h-100">
            <div className="absolute inset-0">
                <img
                    src={trend.posterPath}
                    alt={trend.displayName}
                    className="size-full scale-105 object-cover opacity-40 blur-sm"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent"/>
                <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent"/>
            </div>

            <div className="absolute bottom-0 left-0 z-10 max-w-2xl p-6 md:p-10">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand">
                    <Flame className="size-4 fill-achievement text-achievement"/> #1 Trending
                </div>
                <h2 className="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-5xl">
                    {trend.displayName}
                </h2>
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
                    <Button
                        size="lg"
                        nativeButton={false}
                        render={
                            <Link
                                to="/details/$mediaType/external/$apiId"
                                params={{ mediaType: trend.mediaType, apiId: trend.apiId.toString() }}
                            />
                        }
                    >
                        <Eye data-icon="inline-start"/> See Details
                    </Button>
                </div>
            </div>

            <div className="absolute bottom-6 right-6 hidden aspect-2/3 w-32 rotate-3 transform rounded-lg border shadow-2xl
                transition-transform duration-500 group-hover:rotate-0 md:block md:w-48">
                <img
                    src={trend.posterPath}
                    alt={trend.displayName}
                    className="size-full rounded-md object-cover"
                />
            </div>
        </div>
    );
};
