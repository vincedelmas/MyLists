import {Status} from "@/lib/utils/enums";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface DisplayChaptersProps {
    status: Status;
    total?: number | null;
    currentChapter: number | null;
}


export const DisplayChapters = ({ currentChapter, total, status }: DisplayChaptersProps) => {
    if (status === Status.PLAN_TO_READ) {
        return null;
    }

    return (
        <div className="flex gap-x-1 items-center">
            ch. {currentChapter ? currentChapter : DEFAULT_DASH_FALLBACK}{total ? "/" + total : ""}
        </div>
    );
}
