import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {BookOpen, Calendar} from "lucide-react";
import {extractYear} from "@/lib/utils/date-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaUnderItem} from "@/lib/client/components/media/base/MediaDetailsComps";


export const BooksUnderTitle = ({ media }: FamilyDetailsProps<typeof MediaType.BOOKS>) => {
    return (
        <>
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={BookOpen}>
                {media.pages ?? DEFAULT_DASH_FALLBACK} pages
            </MediaUnderItem>
        </>
    );
};
