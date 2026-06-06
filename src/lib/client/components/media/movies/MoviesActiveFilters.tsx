import {JobType} from "@/lib/utils/enums";
import {SheetFilterObject} from "@/lib/types/media-list.types";


import {formatLocaleName} from "@/lib/utils/text-formatting";


export const getMoviesActiveFilters = (): SheetFilterObject[] => {
    return [
        { key: "actors", title: "Actors", type: "search", job: JobType.ACTOR },
        { key: "directors", title: "Directors", type: "search", job: JobType.CREATOR },
        {
            key: "langs", title: "Languages", type: "checkbox",
            getItems: (data) => data.langs,
            render: (name) => formatLocaleName(name, "language"),
        },
    ];
}
