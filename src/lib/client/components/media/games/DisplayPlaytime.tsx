import {Status} from "@/lib/utils/enums";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface DisplayPlaytimeProps {
    status: Status;
    playtime: number | null;
}


export const DisplayPlaytime = ({ playtime, status }: DisplayPlaytimeProps) => {
    if (status === Status.PLAN_TO_PLAY) {
        return null;
    }

    return (
        <div className="flex gap-x-1 items-center">
            {playtime ? playtime / 60 : DEFAULT_DASH_FALLBACK} h
        </div>
    );
};