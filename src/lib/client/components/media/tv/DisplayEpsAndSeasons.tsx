import {Status} from "@/lib/utils/enums";


import {zeroPad} from "@/lib/utils/number-formatting";


interface DisplayEpsAndSeasonsProps {
    status: Status;
    currentSeason: number;
    currentEpisode: number;
}


export const DisplayEpsAndSeasons = ({ status, currentSeason, currentEpisode }: DisplayEpsAndSeasonsProps) => {
    if (status === Status.RANDOM || status === Status.PLAN_TO_WATCH) {
        return null;
    }

    return (
        <div className="flex gap-x-2 items-center tracking-wide">
            S{zeroPad(currentSeason)}.E{zeroPad(currentEpisode)}
        </div>
    );
};
