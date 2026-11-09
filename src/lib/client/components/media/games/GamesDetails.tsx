import {useEffect} from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Calendar, Clock} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {shouldCheckGameHltb} from "@/lib/utils/media/hltb";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {extractYear, formatDate} from "@/lib/utils/formatting/date";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {gameHltbOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {MediaUnderItem, MediaUnderRating, MediaInfoGridItem, UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type GamesDetailsProps = MediaDetailsProps<typeof MediaType.GAMES>;


const gamesProgressTiming = gamesDefinition.progress.timing;


export const GamesOverTitle = ({ mediaType, media }: GamesDetailsProps) => {
    const developers = media.companies ? media.companies.filter((c) => c.developer) : [];

    return (
        <>
            {developers.slice(0, 3).map((dev) =>
                <Badge key={dev.id} variant="overlay">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: dev.name }}>
                        {dev.name}
                    </Link>
                </Badge>
            )}
        </>
    );
};


export const GamesUnderTitle = ({ media }: GamesDetailsProps) => {
    return (
        <>
            <MediaUnderRating
                divisor={10}
                voteCount={media.voteCount}
                voteAverage={media.voteAverage}
            />
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={Clock}>
                {formatMinutes(media.hltbMainTime ? (media.hltbMainTime * gamesProgressTiming.minutesPerInputUnit) : null, { onlyHours: true })}
            </MediaUnderItem>
        </>
    );
};


export const GamesInfoGrid = ({ mediaType, media }: GamesDetailsProps) => {
    const queryClient = useQueryClient();
    const { data, isFetching } = useQuery(gameHltbOptions(media.id, media.hltbLastCheckedAt, shouldCheckGameHltb(media)));

    useEffect(() => {
        if (!data) return;

        queryClient.setQueryData(mediaDetailsOptions(mediaType, media.id).queryKey, (oldData) => {
            if (!oldData) return;

            return {
                ...oldData,
                media: { ...oldData.media, ...data },
            }
        });

    }, [data, mediaType, media.id, queryClient]);

    const publishers = media.companies ? media.companies.filter((c) => c.publisher) : [];
    const developers = media.companies ? media.companies.filter((c) => c.developer) : [];

    return (
        <>
            <MediaInfoGridItem label="Developed By">
                {developers.length > 0 ?
                    developers.slice(0, 3).map((dev) =>
                        <Link key={dev.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: dev.name }}>
                            <div>{dev.name}</div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Published By">
                {publishers.length > 0 ?
                    publishers.slice(0, 3).map((pub) =>
                        <Link key={pub.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "publisher", name: pub.name }}>
                            <div>{pub.name}</div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Release Date">
                {formatDate(media.releaseDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Perspective">
                {media.playerPerspective ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Engine">
                {media.gameEngine ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB Main">
                {isFetching
                    ? <Spinner aria-label="Loading HLTB times"/>
                    : formatMinutes(media.hltbMainTime ? media.hltbMainTime * gamesProgressTiming.minutesPerInputUnit : null, { onlyHours: true })
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB Main & Extra">
                {isFetching
                    ? <Spinner aria-label="Loading HLTB times"/>
                    : formatMinutes(media.hltbMainAndExtraTime ? media.hltbMainAndExtraTime * gamesProgressTiming.minutesPerInputUnit : null, { onlyHours: true })
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB 100%">
                {isFetching
                    ? <Spinner aria-label="Loading HLTB times"/>
                    : formatMinutes(media.hltbTotalCompleteTime ? media.hltbTotalCompleteTime * gamesProgressTiming.minutesPerInputUnit : null, { onlyHours: true })
                }
            </MediaInfoGridItem>
        </>
    );
};


export const GamesUpComingAlert = ({ media }: GamesDetailsProps) => {
    return (
        <UpComingAlert
            title="Game Release"
            dateString={media.releaseDate}
        />
    );
};
