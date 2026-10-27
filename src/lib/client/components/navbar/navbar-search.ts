import type {LinkProps} from "@tanstack/react-router";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import type {ProviderSearchResult} from "@/lib/types/provider.types";
import {BookOpen, Clapperboard, Gamepad2, LibraryBig, Users, type LucideIcon} from "lucide-react";
import {resolveMediaTypeActive, type MediaListActivationSetting} from "@/lib/utils/media/list-activation";


interface SearchProviderItem {
    label: string;
    icon: LucideIcon;
    mediaType?: MediaType;
    value: ApiProviderType;
}


const searchProviders: SearchProviderItem[] = [
    { label: "Movies & TV", value: ApiProviderType.TMDB, icon: Clapperboard },
    { label: "Books", value: ApiProviderType.BOOKS, icon: BookOpen, mediaType: MediaType.BOOKS },
    { label: "Games", value: ApiProviderType.IGDB, icon: Gamepad2, mediaType: MediaType.GAMES },
    { label: "Manga", value: ApiProviderType.MANGA, icon: LibraryBig, mediaType: MediaType.MANGA },
    { label: "Users", value: ApiProviderType.USERS, icon: Users },
];


export const getSearchProviderItems = (settings?: readonly MediaListActivationSetting[]) => {
    return searchProviders.filter(({ mediaType }) => !mediaType || resolveMediaTypeActive(settings, mediaType));
};


export const getSearchResultLink = (item: ProviderSearchResult): LinkProps => {
    return item.itemType === ApiProviderType.USERS
        ? {
            to: "/profile/$username",
            params: { username: item.name },
        }
        : {
            to: "/details/$mediaType/external/$apiId",
            params: { mediaType: item.itemType as MediaType, apiId: String(item.id) },
        };
};
