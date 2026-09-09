import {MediaType} from "@/lib/utils/enums";
import type {MediaListData} from "@/lib/types/media-list.types";
import {animeList, booksList, gamesList, mangaList, moviesList, seriesList} from "@/lib/server/database/schema";


type TListByType = {
    [MediaType.SERIES]: typeof seriesList.$inferSelect;
    [MediaType.ANIME]: typeof animeList.$inferSelect;
    [MediaType.MOVIES]: typeof moviesList.$inferSelect;
    [MediaType.GAMES]: typeof gamesList.$inferSelect;
    [MediaType.BOOKS]: typeof booksList.$inferSelect & { pages: number };
    [MediaType.MANGA]: typeof mangaList.$inferSelect & { chapters: number };
};


export type MediaListDataByType = {
    [K in MediaType]: MediaListData<TListByType[K]>;
};
