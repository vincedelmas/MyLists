import {Cat, Monitor} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";


export const seriesTheme = {
    icon: Monitor,
    recapColor: "#51c7d5",
    mediaType: MediaType.SERIES,
} as const;


export const animeTheme = {
    icon: Cat,
    recapColor: "#ef7d62",
    mediaType: MediaType.ANIME,
} as const;
