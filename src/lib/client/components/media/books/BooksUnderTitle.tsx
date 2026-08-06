import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {BookOpen, Calendar} from "lucide-react";
import {extractYear} from "@/lib/utils/date-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {MediaUnderItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type BooksDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const BooksUnderTitle = ({ media }: BooksDetailsProps<typeof MediaType.BOOKS>) => {
    const pageUnit = booksDefinition.progress.unit;

    return (
        <>
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={BookOpen}>
                {media.pages ?? DEFAULT_DASH_FALLBACK} {pageUnit.plural}
            </MediaUnderItem>
        </>
    );
};
