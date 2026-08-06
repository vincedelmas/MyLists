import {Status} from "@/lib/utils/enums";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {statusUtils} from "@/lib/utils/media-mapping";


interface DisplayChaptersProps {
    status: Status;
    total?: number | null;
    currentChapter: number | null;
}


export const DisplayChapters = ({ currentChapter, total, status }: DisplayChaptersProps) => {
    if (!statusUtils.canShowProgress(status)) {
        return null;
    }

    return (
        <div className="flex gap-x-1 items-center">
            ch. {currentChapter ? currentChapter : DEFAULT_DASH_FALLBACK}{total ? "/" + total : ""}
        </div>
    );
}
