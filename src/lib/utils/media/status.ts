import {Status} from "@/lib/utils/enums";


export const canShowProgress = (status: Status) => {
    return status !== Status.PLANNED && status !== Status.RANDOM;
}
