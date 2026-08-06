import {Status} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface DisplayPagesProps {
    status: Status;
    total?: number | null;
    currentPage: number | null;
}


export const DisplayPages = ({ currentPage, total, status }: DisplayPagesProps) => {
    if (!statusUtils.canShowProgress(status)) {
        return null;
    }

    return (
        <div className="flex gap-x-1 items-center">
            p. {currentPage ? currentPage : DEFAULT_DASH_FALLBACK}{total ? "/" + total : ""}
        </div>
    );
}
