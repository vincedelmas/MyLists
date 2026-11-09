import {MediaType} from "@/lib/utils/enums";
import type {createTvModule} from "@/lib/server/domain/media/tv";
import type {createGamesModule} from "@/lib/server/domain/media/games";
import type {createMangaModule} from "@/lib/server/domain/media/manga";
import type {createBooksModule} from "@/lib/server/domain/media/books";
import type {createMoviesModule} from "@/lib/server/domain/media/movies";


export type MediaStatsRegistry = MediaModuleRegistry<"statistics">;
export type MediaServiceRegistry = MediaModuleRegistry<"service">;
export type MediaMonthlyActivityRegistry = MediaModuleRegistry<"monthlyActivity">;


type MediaModule = ReturnType<
    | typeof createTvModule
    | typeof createGamesModule
    | typeof createMangaModule
    | typeof createBooksModule
    | typeof createMoviesModule
>;


type MediaModuleRegistry<TField extends keyof MediaModule> = MediaRegistry<{
    [TModule in MediaModule as TModule["mediaType"]]: TModule[TField];
}>;


export type MediaRegistry<TEntries extends Record<MediaType, unknown>> = {
    get<TMediaType extends MediaType>(mediaType: TMediaType): TEntries[TMediaType];
};


export function createMediaRegistry<const TEntries extends Record<MediaType, unknown>>(entries: TEntries): MediaRegistry<TEntries>;


export function createMediaRegistry<
    const TModules extends readonly { mediaType: MediaType }[],
    TField extends keyof TModules[number]
>(modules: TModules & (MediaType extends TModules[number]["mediaType"] ? unknown : never), field: TField): MediaRegistry<{
    [T in MediaType]: Extract<TModules[number], { mediaType: T }>[TField];
}>;


export function createMediaRegistry(entries: Record<MediaType, unknown> | readonly Record<string, unknown>[], field?: string): MediaRegistry<Record<MediaType, unknown>> {
    const immutableEntries = Object.freeze(field === undefined
        ? { ...entries }
        : Object.fromEntries((entries as readonly Record<string, unknown>[]).map(module => [
            module.mediaType, module[field],
        ]))) as Readonly<Record<MediaType, unknown>>;

    return Object.freeze({
        get(mediaType: MediaType) {
            return immutableEntries[mediaType];
        },
    });
}
