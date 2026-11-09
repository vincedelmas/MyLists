import {Popcorn} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";


export const moviesTheme = {
    icon: Popcorn,
    recapColor: "#e6b744",
    mediaType: MediaType.MOVIES,
} as const;
