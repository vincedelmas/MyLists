import type {MediaType} from "./api-client";
import {BookImage, Cat, Gamepad2, Library, Monitor, Popcorn} from "lucide-react-native";
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
    movies: Popcorn,
    series: Monitor,
    anime: Cat,
    games: Gamepad2,
    books: Library,
    manga: BookImage,
};
export {mediaColors};
