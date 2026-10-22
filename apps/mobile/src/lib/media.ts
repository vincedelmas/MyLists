import {mediaColors} from "../theme";
import type {MediaType} from "./api-client";
import {BookImage, Cat, Gamepad2, Library, Monitor, Popcorn} from "lucide-react-native";


export const mediaLabels: Record<MediaType, string> = {
    series: "Series",
    anime: "Anime",
    movies: "Movies",
    games: "Games",
    books: "Books",
    manga: "Manga",
};


export const mediaIcons = {
    series: Monitor,
    anime: Cat,
    movies: Popcorn,
    games: Gamepad2,
    books: Library,
    manga: BookImage,
};


export {mediaColors};
