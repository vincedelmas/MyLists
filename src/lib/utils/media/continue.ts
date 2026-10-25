import {MediaType, UpdateType, type TvMediaType} from "@/lib/utils/enums";
import type {UpdatePayload} from "@/lib/types/user-media.types";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {tvContinueDefinition} from "@/lib/media-definitions/tv/continue.definition";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";

type ContinueItemFor<T extends MediaType> = ContinueStateByType[T];

export type ContinueProgress = {
    value: number;
    label: string;
    total: number | null;
    actionLabel: string;
    update: UpdatePayload | null;
};

export function getTvContinueProgress(item: ContinueItemFor<TvMediaType>): ContinueProgress {
    const seasons = [...item.epsPerSeason].sort((a, b) => a.season - b.season);
    const current = seasons.find(season => season.season === item.currentSeason)!;

    const update = tvContinueDefinition.getUpdate(item);
    const total = seasons.reduce((sum, season) => sum + season.episodes, 0);

    const value = seasons.filter(season => season.season < item.currentSeason)
        .reduce((sum, season) => sum + season.episodes, 0) + item.currentEpisode;

    return {
        value,
        total,
        label: `S${item.currentSeason}/S${seasons.at(-1)!.season} · Eps. ${item.currentEpisode}/${current.episodes}`,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 episode" : "Up to date",
        update: update ? { payload: update } : null,
    };
}


export function getBooksContinueProgress(item: ContinueItemFor<typeof MediaType.BOOKS>): ContinueProgress {
    const value = item.actualPage ?? 0;
    const update = booksDefinition.continue.getUpdate(item);
    const nextPage = update?.type === UpdateType.PAGE ? update.actualPage : value;

    return {
        value,
        total: item.pages || null,
        label: `${value} / ${item.pages || "?"} pages`,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : nextPage > value
            ? `+ ${nextPage - value} ${nextPage - value === 1 ? "page" : "pages"}`
            : item.pages ? "Progress limit reached" : "Page count unknown",
        update: update ? { payload: update } : null,
    };
}


export function getGamesContinueProgress(item: ContinueItemFor<typeof MediaType.GAMES>): ContinueProgress {
    const value = item.playtime ?? 0;
    const hours = Math.floor(value / 60);

    const minutes = value % 60;
    const update = gamesDefinition.continue.getUpdate(item);

    return {
        value,
        total: null,
        label: `${hours}h ${minutes}m played`,
        actionLabel: update ? `+ ${update.playtime - value} min` : "Playtime limit reached",
        update: update ? { payload: update } : null,
    };
}


export function getMangaContinueProgress(item: ContinueItemFor<typeof MediaType.MANGA>): ContinueProgress {
    const value = item.currentChapter;
    const update = mangaDefinition.continue.getUpdate(item);

    return {
        value,
        total: item.chapters || null,
        label: `${value} / ${item.chapters || "?"} chapters`,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 chapter" : "Progress limit reached",
        update: update ? { payload: update } : null,
    };
}
