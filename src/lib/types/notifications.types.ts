import {Status} from "@/lib/utils/enums";


export type NotificationTab = "social" | "media";


export type UpcomingNotificationCandidate = {
    userId: number;
    mediaId: number;
    mediaName: string;
    date: string | null;
    lastEpisode?: number | null;
    seasonToAir?: number | null;
    episodeToAir?: number | null;
};


export type UpComingMedia = {
    userId: number;
    status: Status;
    mediaId: number;
    mediaName: string;
    imageCover: string;
    date: string | null;
    lastEpisode?: number | null;
    seasonToAir?: number | null;
    episodeToAir?: number | null;
};
