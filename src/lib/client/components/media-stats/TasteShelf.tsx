import {Link} from "@tanstack/react-router";
import {getThemeColor} from "@/lib/client/theme";
import {TopAffinity} from "@/lib/types/stats.types";
import {CircleOff, Heart, Play, Star} from "lucide-react";
import {MediaCategory, MediaType} from "@/lib/utils/enums";
import {formatMediaCategoryName} from "@/lib/utils/formatting/text";


type TasteShelfCategory = {
    title: string;
    category: MediaCategory;
    topAffinity: TopAffinity;
};


interface TasteShelfProps {
    mediaType: MediaType;
    categories: TasteShelfCategory[];
}


export function TasteShelf({ mediaType, categories }: TasteShelfProps) {
    const color = getThemeColor(mediaType);

    return (
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map(({ title, category, topAffinity }) => {
                const [first, ...rest] = topAffinity;

                return (
                    <div key={title} className="min-w-0 border-l pl-5" style={{ borderColor: color }}>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            {title}
                        </div>
                        {!first ?
                            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                                <CircleOff className="size-4"/> No data
                            </div>
                            :
                            <>
                                <div className="mt-4 flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="truncate text-lg font-bold">
                                            <Link
                                                className="hover:text-brand"
                                                to="/details/$mediaType/$category/$name"
                                                params={{ mediaType, category, name: first.name }}
                                            >
                                                {formatMediaCategoryName(category, first.name)}
                                            </Link>
                                        </div>
                                        {first.metadata &&
                                            <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Play className="size-3"/>
                                                    {first.metadata.entriesCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Heart className="size-3"/>
                                                    {first.metadata.favoriteCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Star className="size-3"/>
                                                    {first.metadata.avgRating}
                                                </span>
                                            </div>
                                        }
                                    </div>
                                    <div className="text-xl font-black" style={{ color }}>
                                        {first.value}
                                    </div>
                                </div>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {rest.slice(0, 6).map((item, idx) =>
                                        <Link
                                            key={item.name}
                                            to="/details/$mediaType/$category/$name"
                                            params={{ mediaType, category, name: item.name }}
                                            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:text-brand"
                                        >
                                            {idx + 2}. {formatMediaCategoryName(category, item.name)}{" "}
                                            <span className="ml-1 font-semibold text-foreground">
                                                {item.value}
                                            </span>
                                        </Link>
                                    )}
                                </div>
                            </>
                        }
                    </div>
                );
            })}
        </div>
    );
}
