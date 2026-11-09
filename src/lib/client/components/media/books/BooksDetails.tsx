import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {BookOpen, Calendar} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {extractYear} from "@/lib/utils/formatting/date";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {capitalize, formatLocaleName} from "@/lib/utils/formatting/text";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaUnderItem, MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type BooksDetailsProps = MediaDetailsProps<typeof MediaType.BOOKS>;


export const BooksOverTitle = ({ mediaType, media }: BooksDetailsProps) => {
    return (
        <>
            {media.authors?.slice(0, 3).map((author) =>
                <Badge key={author.id} variant="overlay">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                        {author.name}
                    </Link>
                </Badge>
            )}
        </>
    );
};


export const BooksUnderTitle = ({ media }: BooksDetailsProps) => {
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


export const BooksInfoGrid = ({ mediaType, media }: BooksDetailsProps) => {
    const booksProgressUnit = booksDefinition.progress.unit;
    const booksProgressTiming = booksDefinition.progress.timing;

    return (
        <>
            <MediaInfoGridItem label="Authored By">
                {media.authors && media.authors.length > 0 ?
                    media.authors.slice(0, 3).map((author) =>
                        <Link key={author.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                            <div>{author.name}</div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Published By">
                {media.publishers ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Release Date">
                {extractYear(media.releaseDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Language">
                {formatLocaleName(media.language, "language")}
            </MediaInfoGridItem>
            <MediaInfoGridItem label={`Total ${capitalize(booksProgressUnit.plural)}`}>
                {media.pages ?? DEFAULT_DASH_FALLBACK} {booksProgressUnit.short}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Completion">
                {formatMinutes(media.pages * booksProgressTiming.minutesPerUnit)}
            </MediaInfoGridItem>
        </>
    );
};
