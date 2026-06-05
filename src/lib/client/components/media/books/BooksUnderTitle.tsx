import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {BookOpen, Calendar} from "lucide-react";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {MediaUnderItem} from "@/lib/client/components/media/base/MediaDetailsComps";
import {extractYear} from "@/lib/utils/date-formatting";


type BooksDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["underTitle"]>[number];


export const BooksUnderTitle = ({ media }: BooksDetailsProps<typeof MediaType.BOOKS>) => {
    return (
        <>
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={BookOpen}>
                {media.pages ?? "-"} pages
            </MediaUnderItem>
        </>
    );
};
