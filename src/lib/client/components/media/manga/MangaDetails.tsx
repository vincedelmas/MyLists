import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/formatting/text";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Bookmark, Calendar, SquareLibrary} from "lucide-react";
import {extractYear, formatDate} from "@/lib/utils/formatting/date";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaUnderItem, MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type MangaDetailsProps = MediaDetailsProps<typeof MediaType.MANGA>;


export const MangaOverTitle = ({ mediaType, media }: MangaDetailsProps) => {
    const hasAuthors = (media.authors?.length ?? 0) > 0;

    return (
        <>
            <Badge variant="overlay">
                {media.prodStatus}
            </Badge>
            {hasAuthors &&
                <>
                    <span className="text-muted-foreground">•</span>
                    {media.authors?.slice(0, 2).map((author) =>
                        <Badge key={author.id} variant="overlay">
                            <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                                {author.name}
                            </Link>
                        </Badge>
                    )}
                </>
            }
        </>
    );
};


export const MangaUnderTitle = ({ media }: MangaDetailsProps) => {
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


export const MangaInfoGrid = ({ mediaType, media }: MangaDetailsProps) => {
    const mangaProgressUnit = mangaDefinition.progress.unit;
    const mangaProgressTiming = mangaDefinition.progress.timing;

    return (
        <>
            <MediaInfoGridItem label="Prod. Status">
                {media.prodStatus}
            </MediaInfoGridItem>
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
                {media.publishers ?
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "publisher", name: media.publishers }}>
                        {media.publishers}
                    </Link>
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Releasing Dates">
                {formatDate(media.releaseDate)}
                <br/>
                {formatDate(media.endDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label={`Total ${capitalize(mangaProgressUnit.plural)}`}>
                {media.chapters ?? DEFAULT_DASH_FALLBACK} {mangaProgressUnit.plural}
            </MediaInfoGridItem>
            <MediaInfoGridItem label=" Total Volumes">
                {media.volumes ?? DEFAULT_DASH_FALLBACK} volumes
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Completion">
                {formatMinutes(media.chapters ? media.chapters * mangaProgressTiming.minutesPerUnit : null)}
            </MediaInfoGridItem>
        </>
    );
};
