import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {mediaColors} from "../theme";
import type {MediaType} from "./api-client";
import {BookImage, Cat, Gamepad2, Library, Monitor, Popcorn} from "lucide-react-native";


export const mediaLabels: Record<MediaType, string> = {
    series: "Series",
    anime: "Anime",
    movies: "Movies",
    books: "Books",
    games: "Games",
    manga: "Manga",
};


export const mediaIcons = {
    series: Monitor,
    anime: Cat,
    movies: Popcorn,
    books: Library,
    games: Gamepad2,
    manga: BookImage,
};


export {mediaColors};


export const compareMediaTypes = (a: MediaType, b: MediaType) => ALL_MEDIA_TYPES.indexOf(a) - ALL_MEDIA_TYPES.indexOf(b);
