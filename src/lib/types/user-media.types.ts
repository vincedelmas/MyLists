import {UpdateUserMedia} from "@/lib/contracts/media/library";
import type {CommunityActivityStats} from "@/lib/contracts/media/community";


export type UpdatePayload = {
    payload: UpdateUserMedia["payload"];
}

export type MediaCommunityActivityStats = CommunityActivityStats;
