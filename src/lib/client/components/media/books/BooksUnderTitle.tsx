import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Calendar} from "lucide-react";
import {extractYear} from "@/lib/utils/formatting/date";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaUnderItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type BooksDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const BooksUnderTitle = ({ media }: BooksDetailsProps<typeof MediaType.BOOKS>) => {

    return (
        <>
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
        </>
    );
};
