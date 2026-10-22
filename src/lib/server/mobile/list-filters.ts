import { getContainer } from "@/lib/server/core/container";
import { getServerMediaDefinition } from "@/lib/media-definitions/definition.registry.server";
import { getMediaDefinition, type MediaMetadataFilterKey } from "@/lib/media-definitions/definition.registry";
import { InactiveMediaTypeError } from "@/lib/utils/error-classes";
import type { MediaType } from "@/lib/utils/enums";

export async function getMobileListFilterOptions(userId: number, mediaType: MediaType) {
    const { services, registries } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    if (!user.userMediaSettings.some((item) => item.active && item.mediaType === mediaType))
        throw new InactiveMediaTypeError(mediaType);
    const definition = getMediaDefinition(mediaType);
    const metadata = getServerMediaDefinition(mediaType).repository.filters.metadata;
    const options = await registries.mediaService.get(mediaType).getListFilters(userId);
    const labels: Partial<Record<MediaMetadataFilterKey, string>> = { langs: "Languages" };
    return {
        statuses: definition.statuses,
        common: Object.keys(definition.filters.common),
        groups: [
            {
                key: "genres" as const,
                label: "Genres",
                searchable: false,
                options: options.genres.map((item) => item.name),
            },
            { key: "tags" as const, label: "Tags", searchable: false, options: options.tags.map((item) => item.name) },
            ...Object.entries(metadata).map(([field, filter]) => {
                const key = field as MediaMetadataFilterKey;
                return {
                    key,
                    label: labels[key] ?? field.replace(/^./, (letter) => letter.toUpperCase()),
                    searchable: Boolean(filter.searchable),
                    options: (options[key] ?? []).map((item) => item.name),
                };
            }),
        ],
    };
}

export async function searchMobileListFilterOptions(
    userId: number,
    mediaType: MediaType,
    field: MediaMetadataFilterKey,
    query: string,
) {
    const { services, registries } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    if (!user.userMediaSettings.some((item) => item.active && item.mediaType === mediaType))
        throw new InactiveMediaTypeError(mediaType);
    const items = await registries.mediaService.get(mediaType).getSearchListFilters(userId, query, field);
    return items.map((item) => item.name);
}
