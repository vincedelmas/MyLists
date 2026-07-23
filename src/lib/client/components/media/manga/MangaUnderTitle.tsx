import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {extractYear} from "@/lib/utils/date-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Bookmark, Calendar, SquareLibrary} from "lucide-react";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {MediaUnderItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type MangaDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["underTitle"]>[number];


export const MangaUnderTitle = ({ media }: MangaDetailsProps<typeof MediaType.MANGA>) => {
    const chapterUnit = mangaDefinition.progress.unit;

    return (
        <>
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={Bookmark}>
                {media.chapters ?? DEFAULT_DASH_FALLBACK} {chapterUnit.plural}
            </MediaUnderItem>
            <MediaUnderItem icon={SquareLibrary}>
                {media.volumes ?? DEFAULT_DASH_FALLBACK} volumes
            </MediaUnderItem>
        </>
    );
};
