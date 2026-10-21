import type {MediaType} from "./api-client";
import {BookOpen, Clapperboard, Gamepad2, LibraryBig, MonitorPlay, Sparkles} from "lucide-react-native";
import {mediaColors} from "../theme";

export const mediaLabels: Record<MediaType, string> = {
    movies: "Movies",
    series: "TV series",
    anime: "Anime",
    games: "Games",
    books: "Books",
    manga: "Manga",
};
export const mediaIcons = {
    movies: Clapperboard,
    series: MonitorPlay,
    anime: Sparkles,
    games: Gamepad2,
    books: BookOpen,
    manga: LibraryBig,
};
export {mediaColors};
