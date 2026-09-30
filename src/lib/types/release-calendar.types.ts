import {MediaType, Status} from "@/lib/utils/enums";


export interface ReleaseCalendarItem {
    date: string;
    status: Status;
    mediaId: number;
    mediaName: string;
    imageCover: string;
    mediaType: MediaType;
    seasonToAir?: number | null;
    episodeToAir?: number | null;
}
