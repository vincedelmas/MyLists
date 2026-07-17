import type {MediaModule} from "@/lib/server/core/container/media/media-module.registry";


export type UpcomingMediaModule = Extract<MediaModule, {
    library: { upcoming: { forOwner: unknown } };
}>;


export const supportsUpcomingMedia = (
    mediaModule: MediaModule,
): mediaModule is UpcomingMediaModule => "upcoming" in mediaModule.library;
