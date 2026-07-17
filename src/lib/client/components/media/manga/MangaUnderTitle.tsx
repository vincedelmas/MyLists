import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {extractYear} from "@/lib/utils/date-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Bookmark, Calendar, SquareLibrary} from "lucide-react";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaUnderItem} from "@/lib/client/components/media/base/MediaDetailsComps";


export const MangaUnderTitle = ({ media }: FamilyDetailsProps<typeof MediaType.MANGA>) => {
    return (
        <>
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={Bookmark}>
                {media.chapters ?? DEFAULT_DASH_FALLBACK} chapters
            </MediaUnderItem>
            <MediaUnderItem icon={SquareLibrary}>
                {media.volumes ?? DEFAULT_DASH_FALLBACK} volumes
            </MediaUnderItem>
        </>
    );
};
