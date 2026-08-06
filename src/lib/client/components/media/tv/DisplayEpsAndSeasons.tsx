import {Status} from "@/lib/utils/enums";


import {zeroPad} from "@/lib/utils/number-formatting";
import {statusUtils} from "@/lib/utils/media-mapping";


interface DisplayEpsAndSeasonsProps {
    status: Status;
    currentSeason: number;
    currentEpisode: number;
}


export const DisplayEpsAndSeasons = ({ status, currentSeason, currentEpisode }: DisplayEpsAndSeasonsProps) => {
    if (!statusUtils.canShowProgress(status)) {
        return null;
    }

    return (
        <div className="flex gap-x-2 items-center tracking-wide">
            S{zeroPad(currentSeason)}.E{zeroPad(currentEpisode)}
        </div>
    );
};
